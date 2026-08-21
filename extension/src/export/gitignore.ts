import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const TOKENFORGE_GITIGNORE_ENTRY = ".tokenforge/";

function alreadyIgnoresTokenforge(content: string): boolean {
  return content.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    return (
      trimmed === ".tokenforge/" ||
      trimmed === ".tokenforge" ||
      trimmed === "**/.tokenforge/" ||
      trimmed === "**/.tokenforge"
    );
  });
}

/**
 * Ensure the workspace root `.gitignore` ignores `.tokenforge/`.
 * Appends the entry when missing; creates `.gitignore` when absent.
 * @returns true when the file was created or modified.
 */
export async function ensureTokenforgeGitignored(root: string): Promise<boolean> {
  const gitignorePath = join(root, ".gitignore");
  let content: string | undefined;
  try {
    content = await readFile(gitignorePath, "utf8");
  } catch {
    await writeFile(gitignorePath, `${TOKENFORGE_GITIGNORE_ENTRY}\n`, "utf8");
    return true;
  }

  if (alreadyIgnoresTokenforge(content)) {
    return false;
  }

  const suffix = content.length === 0 || content.endsWith("\n") ? "" : "\n";
  await writeFile(
    gitignorePath,
    `${content}${suffix}${TOKENFORGE_GITIGNORE_ENTRY}\n`,
    "utf8",
  );
  return true;
}
