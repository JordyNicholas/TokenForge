import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  MAX_INSTRUCTION_BYTES,
} from "../../adapters";
import { runCli } from "../../app/cli";
import { captureIo, cleanupFixture, fixtureRoot } from "../../test/helpers";
import { applyPolicy, initRepo } from "./apply";

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
    expect(exclusions).toContain("dist/**");
    expect(exclusions).not.toContain("dist/bundle.js");
  });

  it("forwards hybrid mode into init scan (noop enricher)", async () => {
    const result = await initRepo({
      root: fixtureRoot,
      provider: "copilot",
      mode: "hybrid",
    });

    expect(result.report.scan).toMatchObject({
      mode: "hybrid",
      llm: { backend: "noop" },
    });
    expect(result.report.layers?.llm).toBeDefined();
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
