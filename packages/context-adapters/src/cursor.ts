import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ContextCapabilities,
  ProviderContextAdapter,
  ShieldMode,
  ShieldResult,
} from "./types.js";
import {
  mergeIgnoreSection,
  normalizeIgnorePattern,
  removePathFromIgnoreSection,
} from "./ignore-merge.js";
import {
  removeSessionShieldEntry,
  SESSION_SHIELD_PATH,
  upsertSessionShieldEntry,
} from "./session-shield-file.js";

const capabilities: ContextCapabilities = {
  id: "cursor",
  displayName: "Cursor",
  effectiveness: "full",
  supportsSoftShield: true,
  supportsHardShield: true,
};

function ignoreFileForMode(mode: ShieldMode): string {
  return mode === "soft" ? ".cursorindexingignore" : ".cursorignore";
}

async function readRepoFile(root: string, relativePath: string): Promise<string> {
  try {
    return await readFile(join(root, relativePath), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function writeRepoFile(
  root: string,
  relativePath: string,
  contents: string,
): Promise<void> {
  await writeFile(join(root, relativePath), contents, "utf8");
}

/** Cursor adapter: soft shields via `.cursorindexingignore`, hard via `.cursorignore`. */
export const cursorContextAdapter: ProviderContextAdapter = {
  id: "cursor",
  capabilities,

  async shield(root, path, mode): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    const ignoreFile = ignoreFileForMode(mode);
    const existing = await readRepoFile(root, ignoreFile);
    const merged = mergeIgnoreSection(existing, [normalizedPath]);
    await writeRepoFile(root, ignoreFile, merged);
    await upsertSessionShieldEntry(root, {
      path: normalizedPath,
      mode,
      provider: "cursor",
      shieldedAt: new Date().toISOString(),
    });

    return {
      path: normalizedPath,
      mode,
      effectiveness: capabilities.effectiveness,
      modifiedFiles: [ignoreFile, SESSION_SHIELD_PATH],
      shielded: true,
    };
  },

  async unshield(root, path): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    const modifiedFiles: string[] = [SESSION_SHIELD_PATH];

    for (const mode of ["soft", "hard"] as const) {
      const ignoreFile = ignoreFileForMode(mode);
      const existing = await readRepoFile(root, ignoreFile);
      const updated = removePathFromIgnoreSection(existing, normalizedPath);
      if (updated !== existing) {
        if (updated.length === 0) {
          await writeRepoFile(root, ignoreFile, "");
        } else {
          await writeRepoFile(root, ignoreFile, updated);
        }
        modifiedFiles.push(ignoreFile);
      }
    }

    await removeSessionShieldEntry(root, normalizedPath);

    return {
      path: normalizedPath,
      mode: "soft",
      effectiveness: capabilities.effectiveness,
      modifiedFiles,
      shielded: false,
    };
  },
};
