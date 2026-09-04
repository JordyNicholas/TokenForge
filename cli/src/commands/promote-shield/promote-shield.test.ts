import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { CURSOR_IGNORE_CANDIDATES_PATH } from "@tokenforge/policy-adapters";
import { TOKENFORGE_IGNORE_BEGIN } from "@tokenforge/context-adapters";
import { promoteShieldCandidates } from "./promote-shield";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function tempRoot(prefix: string): string {
  const root = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  roots.push(root);
  return root;
}

describe("promoteShieldCandidates", () => {
  it("merges cursor candidates into .cursorignore", async () => {
    const root = tempRoot("tf-promote-cursor");
    await mkdir(join(root, ".cursor"), { recursive: true });
    await writeFile(
      join(root, CURSOR_IGNORE_CANDIDATES_PATH),
      "# review\npackage-lock.json\ndist/**\n",
      "utf8",
    );

    const result = await promoteShieldCandidates({ root, provider: "cursor" });
    expect(result.promoted).toBe(true);
    expect(result.targetPath).toBe(".cursorignore");
    expect(result.patterns).toEqual(["package-lock.json", "dist/**"]);

    const ignore = await import("node:fs/promises").then((fs) =>
      fs.readFile(join(root, ".cursorignore"), "utf8"),
    );
    expect(ignore).toContain(TOKENFORGE_IGNORE_BEGIN);
    expect(ignore).toContain("package-lock.json");
  });

  it("dry-run does not write .cursorignore", async () => {
    const root = tempRoot("tf-promote-dry");
    await mkdir(join(root, ".cursor"), { recursive: true });
    await writeFile(
      join(root, CURSOR_IGNORE_CANDIDATES_PATH),
      "vendor/**\n",
      "utf8",
    );

    const result = await promoteShieldCandidates({
      root,
      provider: "cursor",
      dryRun: true,
    });
    expect(result.promoted).toBe(false);
    expect(result.message).toMatch(/dry-run/);

    await expect(
      import("node:fs/promises").then((fs) => fs.access(join(root, ".cursorignore"))),
    ).rejects.toThrow();
  });
});
