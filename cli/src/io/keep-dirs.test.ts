import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { collectKeptContent } from "./keep-dirs";

async function repoWith(files: readonly string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tokenforge-keep-dirs-"));
  for (const file of files) {
    const abs = join(root, file);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, "x", "utf8");
  }
  return root;
}

function report(excluded: readonly string[]): Pick<TokenRiskReport, "findings"> {
  return {
    findings: excluded.map((path) => ({
      path,
      reason: "oversized" as const,
      bytes: 1,
      estTokens: 1,
      action: "excluded" as const,
    })),
  };
}

describe("collectKeptContent", () => {
  it("names the ancestors of kept source and config", async () => {
    const root = await repoWith([
      "core/js/tabler.js",
      "core/fonts/geist/Geist.ttf",
      "package.json",
    ]);
    const { keepDirs: dirs } = await collectKeptContent(root, report(["core/fonts/geist/Geist.ttf"]));
    expect(dirs.has("core")).toBe(true);
    expect(dirs.has("core/js")).toBe(true);
    // Nothing kept lives here — a glob for it stays legal.
    expect(dirs.has("core/fonts")).toBe(false);
    expect(dirs.has("core/fonts/geist")).toBe(false);
  });

  it("ignores a kept path that is itself excluded", async () => {
    const root = await repoWith(["docs/content/big.mdx", "docs/images/cover.jpg"]);
    const { keepDirs: dirs } = await collectKeptContent(root, report(["docs/content/big.mdx"]));
    expect(dirs.has("docs/content")).toBe(false);
  });

  it("counts a protected contract as kept", async () => {
    const root = await repoWith(["api/openapi.yaml", "api/dump.jpg"]);
    const { keepDirs: dirs } = await collectKeptContent(root, report(["api/dump.jpg"]));
    expect(dirs.has("api")).toBe(true);
  });

  it("does not walk into skipped directories", async () => {
    const root = await repoWith(["node_modules/pkg/index.js", "src/app.ts"]);
    const { keepDirs: dirs } = await collectKeptContent(root, report([]));
    expect(dirs.has("node_modules")).toBe(false);
    expect(dirs.has("src")).toBe(true);
  });

  it("returns an empty set for a repo of pure assets", async () => {
    const root = await repoWith(["assets/a.jpg", "assets/b.jpg"]);
    const { keepDirs: dirs } = await collectKeptContent(root, report(["assets/a.jpg", "assets/b.jpg"]));
    expect(dirs.size).toBe(0);
  });

  it("ranks source roots by how much source they hold", async () => {
    const root = await repoWith([
      "core/a.js",
      "core/b.js",
      "core/c.js",
      "js/one.js",
      "docs/guide.md",
      "package.json",
    ]);
    const { sourceRoots } = await collectKeptContent(root, report([]));
    expect(sourceRoots).toEqual(["core", "js"]);
  });

  it("leaves source roots empty when the repo has no source tree", async () => {
    const root = await repoWith(["assets/a.jpg", "package.json"]);
    const { sourceRoots } = await collectKeptContent(root, report([]));
    expect(sourceRoots).toEqual([]);
  });
});
