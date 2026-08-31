import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isSecretPath, type RepoAuditCoverage } from "@tokenforge/risk-core";
import { hasSecretContent } from "../secrets";

/** Directories never copied into a Codex audit sandbox (#189). */
export const CODEX_AUDIT_HARD_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".tokenforge",
]);

const MAX_STAGING_FILE_BYTES = 2_097_152;

export type RepositoryStagingResult = {
  coverage: RepoAuditCoverage;
  stagedPaths: ReadonlySet<string>;
};

function normalizeRelativePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function pathHasHardSkip(relativePath: string): boolean {
  return normalizeRelativePath(relativePath)
    .split("/")
    .some((segment) => CODEX_AUDIT_HARD_SKIP_DIRS.has(segment));
}

/**
 * Copy an eligible repository tree into an ephemeral directory for Codex audit.
 * Drops credential-shaped paths and secret-shaped content; never redacts.
 */
export async function stageRepositoryForAudit(
  sourceRoot: string,
  destRoot: string,
): Promise<RepositoryStagingResult> {
  let filesCopied = 0;
  let filesSkippedSecret = 0;
  let filesSkippedHardDir = 0;
  let bytesCopied = 0;
  const stagedPaths = new Set<string>();

  async function walk(absDir: string, relDir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (CODEX_AUDIT_HARD_SKIP_DIRS.has(entry.name)) {
          filesSkippedHardDir += 1;
          continue;
        }
        await walk(join(absDir, entry.name), relPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const normalized = normalizeRelativePath(relPath);
      if (pathHasHardSkip(normalized)) {
        filesSkippedHardDir += 1;
        continue;
      }
      if (isSecretPath(normalized)) {
        filesSkippedSecret += 1;
        continue;
      }

      const absFile = join(absDir, entry.name);
      let raw: Buffer;
      try {
        const fileStat = await stat(absFile);
        if (fileStat.size > MAX_STAGING_FILE_BYTES) {
          continue;
        }
        raw = await readFile(absFile);
      } catch {
        continue;
      }

      const text = raw.toString("utf8");
      if (hasSecretContent(text)) {
        filesSkippedSecret += 1;
        continue;
      }

      const destPath = join(destRoot, normalized);
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, raw);
      stagedPaths.add(normalized);
      filesCopied += 1;
      bytesCopied += raw.length;
    }
  }

  await mkdir(destRoot, { recursive: true });
  await walk(sourceRoot, "");

  return {
    coverage: {
      mode: "codex_repo_audit",
      filesCopied,
      filesSkippedSecret,
      filesSkippedHardDir,
      bytesCopied,
    },
    stagedPaths,
  };
}
