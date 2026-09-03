import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isPathCoveredByExclusion } from "@tokenforge/risk-core";
import { applyPolicy } from "./apply";
import { cleanupFixtureAt, overCollapseAppRoot } from "../../test/helpers";

/** Every repo-relative file in the fixture, excluding TokenForge output. */
async function fixtureFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === ".tokenforge" || entry.name === ".github") {
        continue;
      }
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      files.push(relative(root, abs).replaceAll("\\", "/"));
    }
  }
  await walk(root);
  return files;
}

/** Globs and paths the pack tells the agent not to load. */
function excludedPatterns(markdown: string): string[] {
  return [...markdown.matchAll(/^- `([^`]+)`$/gm)].map((match) => match[1]!);
}

describe("apply on over-collapse-app", () => {
  afterEach(async () => {
    await cleanupFixtureAt(overCollapseAppRoot);
  });

  it("never names a kept source path in the policy pack", async () => {
    const result = await applyPolicy({
      root: overCollapseAppRoot,
      provider: "copilot",
      dryRun: true,
    });
    const instructions = result.files.find((file) =>
      file.path.endsWith("copilot-instructions.md"),
    );
    expect(instructions).toBeDefined();

    const patterns = excludedPatterns(instructions!.contents);
    const excluded = new Set(
      result.report.findings
        .filter((finding) => finding.action === "excluded")
        .map((finding) => finding.path),
    );

    // The pack may only ever cover paths the scan actually flagged.
    for (const file of await fixtureFiles(overCollapseAppRoot)) {
      if (excluded.has(file)) {
        continue;
      }
      expect(
        isPathCoveredByExclusion(file, patterns),
        `${file} is kept content but the pack excludes it`,
      ).toBe(false);
    }
  });

  it("claims the deepest cluster and leaves the rest as files", async () => {
    const result = await applyPolicy({
      root: overCollapseAppRoot,
      provider: "copilot",
      dryRun: true,
    });
    const instructions = result.files.find((file) =>
      file.path.endsWith("copilot-instructions.md"),
    )!;
    const patterns = excludedPatterns(instructions.contents);

    expect(patterns).toContain("assets/screenshots/**");
    // Two files is under the collapse floor, so both are named.
    expect(patterns).toContain("assets/fonts/Brand-Bold.ttf");
    expect(patterns).toContain("assets/fonts/Brand-Regular.ttf");
    // The trap: one oversized binary under the source root.
    expect(patterns).toContain("src/hero-illustration.png");
    expect(patterns).not.toContain("src/**");
    expect(patterns).not.toContain("assets/**");
    expect(patterns).not.toContain("docs/**");
  });

  it("covers assets that clear no size bar (#300)", async () => {
    const result = await applyPolicy({
      root: overCollapseAppRoot,
      provider: "copilot",
      dryRun: true,
    });
    const instructions = result.files.find((file) =>
      file.path.endsWith("copilot-instructions.md"),
    )!;
    const patterns = excludedPatterns(instructions.contents);

    // ~200 bytes each: a size-only heuristic produced nothing for this
    // directory, so the glob did not exist before the media class.
    expect(patterns).toContain("assets/icons/**");
    // One small asset beside kept source — named, never widened to the dir.
    expect(patterns).toContain("src/util/spinner.svg");
    expect(patterns).not.toContain("src/util/**");

    const icons = result.report.findings.filter((finding) =>
      finding.path.startsWith("assets/icons/"),
    );
    expect(icons).toHaveLength(3);
    for (const icon of icons) {
      expect(icon.reason).toBe("high_risk_filetype");
      expect(icon.action).toBe("excluded");
      expect(icon.bytes).toBeLessThan(1_000);
    }
  });

  it("points Prefer at the real source root", async () => {
    const result = await applyPolicy({
      root: overCollapseAppRoot,
      provider: "copilot",
      dryRun: true,
    });
    const instructions = result.files.find((file) =>
      file.path.endsWith("copilot-instructions.md"),
    )!;
    expect(instructions.contents).toContain("Living source under `src/`");
  });

  it("writes nothing to the fixture on a dry run", async () => {
    await applyPolicy({
      root: overCollapseAppRoot,
      provider: "copilot",
      dryRun: true,
    });
    await expect(stat(join(overCollapseAppRoot, ".github"))).rejects.toThrow();
  });
});
