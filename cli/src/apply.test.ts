import { readFile, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  MAX_INSTRUCTION_BYTES,
  copilotAdapter,
  getAdapter,
} from "./adapters";
import { applyPolicy, initRepo } from "./apply";
import { runCli } from "./cli";
import { UsageError } from "./errors";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/noisy-app");

async function cleanupFixture(): Promise<void> {
  await rm(resolve(fixtureRoot, ".tokenforge"), { recursive: true, force: true });
  await rm(resolve(fixtureRoot, ".github"), { recursive: true, force: true });
}

function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write(chunk: string) { stdout += chunk; } },
      stderr: { write(chunk: string) { stderr += chunk; } },
    },
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    },
  };
}

describe("getAdapter", () => {
  it("stubs cursor and claude", () => {
    expect(() => getAdapter("cursor")).toThrow(UsageError);
    expect(() => getAdapter("claude")).toThrow(UsageError);
  });

  it("renders a short Copilot instruction file", () => {
    const files = copilotAdapter.render({
      source: "cli",
      timestamp: "2026-08-17T18:00:00.000Z",
      repo: "fixtures/noisy-app",
      team: "payments-platform",
      provider: "copilot",
      findings: [
        {
          path: "package-lock.json",
          reason: "high_risk_filetype",
          bytes: 100,
          estTokens: 25,
          action: "excluded",
        },
      ],
      totals: { beforeTokens: 100, afterTokens: 10, savedTokens: 90 },
    });

    const instructions = files.find((file) => file.path === COPILOT_INSTRUCTIONS_PATH);
    const exclusions = files.find((file) => file.path === COPILOT_EXCLUSIONS_PATH);
    expect(instructions).toBeDefined();
    expect(Buffer.byteLength(instructions?.contents ?? "", "utf8")).toBeLessThanOrEqual(
      MAX_INSTRUCTION_BYTES,
    );
    expect(exclusions?.contents).toContain("package-lock.json");
  });
});

describe("apply / init on noisy-app", () => {
  afterEach(cleanupFixture);

  it("dry-run does not write policy files", async () => {
    const result = await applyPolicy({ root: fixtureRoot, dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.report.totals.afterTokens).toBeLessThan(result.report.totals.beforeTokens);
    await expect(stat(resolve(fixtureRoot, ".github"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("writes a lean Copilot pack and keeps afterTokens below beforeTokens", async () => {
    const result = await initRepo({
      root: fixtureRoot,
      provider: "copilot",
      team: "payments-platform",
      repo: "fixtures/noisy-app",
    });

    expect(result.dryRun).toBe(false);
    expect(result.report.provider).toBe("copilot");
    expect(result.report.totals.afterTokens).toBeLessThan(result.report.totals.beforeTokens);
    expect(result.report.totals.beforeTokens).toBeGreaterThan(0);

    const instructions = await readFile(
      resolve(fixtureRoot, COPILOT_INSTRUCTIONS_PATH),
      "utf8",
    );
    expect(Buffer.byteLength(instructions, "utf8")).toBeLessThanOrEqual(MAX_INSTRUCTION_BYTES);
    expect(instructions.length).toBeLessThan(1_200);

    const exclusions = await readFile(
      resolve(fixtureRoot, COPILOT_EXCLUSIONS_PATH),
      "utf8",
    );
    expect(exclusions).toContain("package-lock.json");
    expect(exclusions).toContain("dist/bundle.js");
  });

  it("returns usage exit code 2 for a stubbed provider", async () => {
    const captured = captureIo();
    const code = await runCli(
      ["apply", fixtureRoot, "--provider", "cursor", "--dry-run"],
      captured.io,
    );
    expect(code).toBe(2);
    expect(captured.stderr).toContain("stubbed");
  });
});
