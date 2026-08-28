import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  TOKENFORGE_GITIGNORE_ENTRY,
  bootstrapRepo,
} from "./repo-bootstrap";

const tempRoot = resolve(
  import.meta.dirname,
  "../../.test-tmp/repo-bootstrap",
);

async function resetTemp(): Promise<void> {
  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });
}

describe("bootstrapRepo", () => {
  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("creates .tokenforge and appends a gitignore entry once", async () => {
    await resetTemp();
    await writeFile(join(tempRoot, ".gitignore"), "node_modules/\n", "utf8");

    const first = await bootstrapRepo(tempRoot);
    expect(first.createdTokenforgeDir).toBe(true);
    expect(first.gitignoreEntryAdded).toBe(true);

    const second = await bootstrapRepo(tempRoot);
    expect(second.createdTokenforgeDir).toBe(false);
    expect(second.gitignoreEntryAdded).toBe(false);

    const gitignore = await readFile(join(tempRoot, ".gitignore"), "utf8");
    expect(gitignore).toContain(TOKENFORGE_GITIGNORE_ENTRY);
    expect(gitignore.split(TOKENFORGE_GITIGNORE_ENTRY).length - 1).toBe(1);
  });

  it("dry-run reports planned gitignore change without writing", async () => {
    await resetTemp();
    await writeFile(join(tempRoot, ".gitignore"), "", "utf8");

    const result = await bootstrapRepo(tempRoot, { dryRun: true });
    expect(result.gitignoreEntryAdded).toBe(true);
    expect(result.createdTokenforgeDir).toBe(false);
    expect(await readFile(join(tempRoot, ".gitignore"), "utf8")).toBe("");
  });

  it("skips gitignore when .tokenforge is already listed", async () => {
    await resetTemp();
    await writeFile(join(tempRoot, ".gitignore"), ".tokenforge/\n", "utf8");

    const result = await bootstrapRepo(tempRoot);
    expect(result.gitignoreEntryAdded).toBe(false);
  });
});
