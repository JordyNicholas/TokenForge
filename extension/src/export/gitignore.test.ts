import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  TOKENFORGE_GITIGNORE_ENTRY,
  ensureTokenforgeGitignored,
} from "./gitignore";

describe("ensureTokenforgeGitignored", () => {
  it("creates .gitignore when missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "tf-gi-"));
    await expect(ensureTokenforgeGitignored(root)).resolves.toBe(true);
    await expect(readFile(join(root, ".gitignore"), "utf8")).resolves.toBe(
      `${TOKENFORGE_GITIGNORE_ENTRY}\n`,
    );
  });

  it("appends when .gitignore exists without the entry", async () => {
    const root = await mkdtemp(join(tmpdir(), "tf-gi-"));
    await writeFile(join(root, ".gitignore"), "node_modules/\n", "utf8");
    await expect(ensureTokenforgeGitignored(root)).resolves.toBe(true);
    await expect(readFile(join(root, ".gitignore"), "utf8")).resolves.toBe(
      `node_modules/\n${TOKENFORGE_GITIGNORE_ENTRY}\n`,
    );
  });

  it("is a no-op when already ignored", async () => {
    const root = await mkdtemp(join(tmpdir(), "tf-gi-"));
    await writeFile(
      join(root, ".gitignore"),
      `dist/\n${TOKENFORGE_GITIGNORE_ENTRY}\n`,
      "utf8",
    );
    await expect(ensureTokenforgeGitignored(root)).resolves.toBe(false);
    await expect(readFile(join(root, ".gitignore"), "utf8")).resolves.toBe(
      `dist/\n${TOKENFORGE_GITIGNORE_ENTRY}\n`,
    );
  });
});
