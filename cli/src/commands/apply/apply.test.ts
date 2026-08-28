import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isProveChangeMarker } from "@tokenforge/risk-core";
import {
  CLAUDE_INSTRUCTIONS_PATH,
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  MAX_INSTRUCTION_BYTES,
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
} from "../../adapters";
import { runCli } from "../../app/cli";
import { captureIo, cleanupFixture, fixtureRoot } from "../../test/helpers";
import { applyPolicy, initRepo } from "./apply";

describe("apply / init on noisy-app", () => {
  afterEach(cleanupFixture);

  it("dry-run does not write policy files", async () => {
    const result = await applyPolicy({ root: fixtureRoot, dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.changeMarker).toBeUndefined();
    expect(result.writes.every((write) => write.disposition === "create")).toBe(true);
    expect(result.report.totals.afterTokens).toBeLessThan(result.report.totals.beforeTokens);
    await expect(stat(resolve(fixtureRoot, ".github"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("creates conventional Copilot instructions with a managed TokenForge section", async () => {
    const result = await initRepo({
      root: fixtureRoot,
      provider: "copilot",
      team: "payments-platform",
      repo: "fixtures/noisy-app",
    });

    expect(result.dryRun).toBe(false);
    expect(result.report.provider).toBe("copilot");
    expect(result.report.totals.afterTokens).toBeLessThan(result.report.totals.beforeTokens);
    expect(result.writes).toEqual(
      expect.arrayContaining([
        { path: COPILOT_INSTRUCTIONS_PATH, disposition: "create" },
        { path: COPILOT_EXCLUSIONS_PATH, disposition: "create" },
      ]),
    );
    expect(result.changeMarker).toMatchObject({
      provider: "copilot",
      packId: "apply:copilot",
      action: "apply",
      team: "payments-platform",
      repo: "fixtures/noisy-app",
    });
    expect(isProveChangeMarker(result.changeMarker)).toBe(true);

    const latest = JSON.parse(
      await readFile(resolve(fixtureRoot, ".tokenforge/prove-change-latest.json"), "utf8"),
    ) as unknown;
    expect(isProveChangeMarker(latest)).toBe(true);

    const trail = await readFile(
      resolve(fixtureRoot, ".tokenforge/prove-changes.jsonl"),
      "utf8",
    );
    expect(isProveChangeMarker(JSON.parse(trail.trim()))).toBe(true);

    const instructions = await readFile(
      resolve(fixtureRoot, COPILOT_INSTRUCTIONS_PATH),
      "utf8",
    );
    expect(instructions).toContain(TOKENFORGE_SECTION_BEGIN);
    expect(instructions).toContain(TOKENFORGE_SECTION_END);
    expect(instructions).toContain("Copilot instructions (TokenForge)");
    expect(Buffer.byteLength(instructions, "utf8")).toBeLessThanOrEqual(
      MAX_INSTRUCTION_BYTES + 80,
    );

    const exclusions = await readFile(
      resolve(fixtureRoot, COPILOT_EXCLUSIONS_PATH),
      "utf8",
    );
    expect(exclusions).toContain("package-lock.json");
    expect(exclusions).toContain("dist/**");
    expect(exclusions).not.toContain("dist/bundle.js");
  });

  it("appends a TokenForge section without destroying existing Copilot instructions", async () => {
    const path = resolve(fixtureRoot, COPILOT_INSTRUCTIONS_PATH);
    await mkdir(dirname(path), { recursive: true });
    const prior = "# Team Copilot rules\n\nPrefer small PRs.\n";
    await writeFile(path, prior, "utf8");

    const result = await applyPolicy({
      root: fixtureRoot,
      provider: "copilot",
      dryRun: false,
    });

    expect(result.writes.find((w) => w.path === COPILOT_INSTRUCTIONS_PATH)?.disposition).toBe(
      "merge",
    );
    const merged = await readFile(path, "utf8");
    expect(merged.startsWith("# Team Copilot rules")).toBe(true);
    expect(merged).toContain("Prefer small PRs.");
    expect(merged).toContain(TOKENFORGE_SECTION_BEGIN);
    expect(merged).toContain("Copilot instructions (TokenForge)");
    expect(result.changeMarker?.action).toBe("apply");
  });

  it("updates an existing TokenForge section in CLAUDE.md and keeps user text", async () => {
    const path = resolve(fixtureRoot, CLAUDE_INSTRUCTIONS_PATH);
    const prior = [
      "# Team CLAUDE.md",
      "",
      "Keep shipping.",
      "",
      TOKENFORGE_SECTION_BEGIN,
      "# old TokenForge",
      TOKENFORGE_SECTION_END,
      "",
      "## Footer",
      "Stay.",
      "",
    ].join("\n");
    await writeFile(path, prior, "utf8");

    const dry = await applyPolicy({
      root: fixtureRoot,
      provider: "claude",
      dryRun: true,
    });
    expect(dry.writes.find((w) => w.path === CLAUDE_INSTRUCTIONS_PATH)?.disposition).toBe(
      "merge",
    );
    expect(await readFile(path, "utf8")).toBe(prior);

    const applied = await applyPolicy({
      root: fixtureRoot,
      provider: "claude",
      dryRun: false,
    });
    const updated = await readFile(path, "utf8");
    expect(updated).toContain("Keep shipping.");
    expect(updated).toContain("Stay.");
    expect(updated).toContain("Claude / Codex instructions (TokenForge)");
    expect(updated).not.toContain("# old TokenForge");
    expect(applied.changeMarker?.packId).toBe("apply:claude");
  });

  it("dry-run stdout documents create/merge dispositions", async () => {
    const path = resolve(fixtureRoot, COPILOT_INSTRUCTIONS_PATH);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, "# existing\n", "utf8");

    const captured = captureIo();
    const code = await runCli(
      ["apply", fixtureRoot, "--provider", "copilot", "--dry-run"],
      captured.io,
    );
    expect(code).toBe(0);
    const out = captured.stdout + captured.stderr;
    expect(out).toMatch(/managed TokenForge section/);
    expect(out).toMatch(/merge\s+\.github\/copilot-instructions\.md/);
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

  it("bootstrap adds .tokenforge to .gitignore on init", async () => {
    const root = resolve(fixtureRoot, "..", ".init-bootstrap-test");
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    await writeFile(resolve(root, "README.md"), "# scratch\n", "utf8");
    await writeFile(resolve(root, ".gitignore"), "node_modules/\n", "utf8");

    try {
      await initRepo({ root, provider: "copilot", skipApply: true });
      const gitignore = await readFile(resolve(root, ".gitignore"), "utf8");
      expect(gitignore).toContain(".tokenforge/");
      expect(await readFile(resolve(root, ".tokenforge/scan-report.json"), "utf8")).toBeTruthy();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("skip-apply writes scan report without policy files", async () => {
    const result = await initRepo({
      root: fixtureRoot,
      provider: "copilot",
      skipApply: true,
    });
    expect(result.writes).toEqual([]);
    expect(result.files).toEqual([]);
    expect(result.changeMarker).toBeUndefined();
    expect(result.report.totals.savedTokens).toBeGreaterThan(0);
  });

  it("applies cursor adapter on dry-run", async () => {
    const captured = captureIo();
    const code = await runCli(
      ["apply", fixtureRoot, "--provider", "cursor", "--dry-run"],
      captured.io,
    );
    expect(code).toBe(0);
    expect(captured.stdout + captured.stderr).toMatch(/\.cursor\//);
  });
});
