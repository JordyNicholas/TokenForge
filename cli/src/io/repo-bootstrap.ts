import { access, appendFile, mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tokenforgeDir } from "./paths";

export const TOKENFORGE_GITIGNORE_ENTRY = ".tokenforge/";

export type RepoBootstrapResult = {
  tokenforgeDir: string;
  createdTokenforgeDir: boolean;
  gitignorePath: string | null;
  gitignoreEntryAdded: boolean;
};

async function pathExists(abs: string): Promise<boolean> {
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}

function gitignoreAlreadyListsTokenforge(contents: string): boolean {
  return contents
    .split(/\r?\n/)
    .some((line) => {
      const trimmed = line.trim();
      return (
        trimmed === ".tokenforge" ||
        trimmed === ".tokenforge/" ||
        trimmed === "/.tokenforge" ||
        trimmed === "/.tokenforge/"
      );
    });
}

/**
 * Ensure `.tokenforge/` exists and `.gitignore` ignores local scan artifacts.
 * Idempotent — safe to run on every `tokenforge init`.
 */
export async function bootstrapRepo(
  root: string,
  options: { dryRun?: boolean } = {},
): Promise<RepoBootstrapResult> {
  const resolved = resolve(root);
  const dir = tokenforgeDir(resolved);
  const dryRun = Boolean(options.dryRun);
  const existed = await pathExists(dir);

  if (!dryRun && !existed) {
    await mkdir(dir, { recursive: true });
  }

  const gitignorePath = join(resolved, ".gitignore");
  let gitignoreEntryAdded = false;
  if (await pathExists(gitignorePath)) {
    const contents = await readFile(gitignorePath, "utf8");
    if (!gitignoreAlreadyListsTokenforge(contents)) {
      gitignoreEntryAdded = true;
      if (!dryRun) {
        const prefix = contents.endsWith("\n") || contents.length === 0 ? "" : "\n";
        await appendFile(
          gitignorePath,
          `${prefix}${TOKENFORGE_GITIGNORE_ENTRY}\n`,
          "utf8",
        );
      }
    }
  }

  return {
    tokenforgeDir: dir,
    createdTokenforgeDir: !existed && !dryRun,
    gitignorePath: (await pathExists(gitignorePath)) ? gitignorePath : null,
    gitignoreEntryAdded,
  };
}
