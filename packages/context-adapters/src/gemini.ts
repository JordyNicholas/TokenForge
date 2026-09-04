import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ContextCapabilities,
  ProviderContextAdapter,
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

const GEMINI_IGNORE = ".geminiignore";

const capabilities: ContextCapabilities = {
  id: "gemini",
  displayName: "Google Gemini",
  /** Gemini CLI may still ingest paths via other channels — ignore merge is best-effort. */
  effectiveness: "partial",
  supportsSoftShield: true,
  supportsHardShield: true,
};

async function readGeminiIgnore(root: string): Promise<string> {
  try {
    return await readFile(join(root, GEMINI_IGNORE), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function writeGeminiIgnore(root: string, contents: string): Promise<void> {
  await writeFile(join(root, GEMINI_IGNORE), contents, "utf8");
}

/**
 * Gemini partial adapter: merges shields into `.geminiignore` when present.
 * Host honor is partial — session-shield.json records intent for Prove.
 */
export const geminiContextAdapter: ProviderContextAdapter = {
  id: "gemini",
  capabilities,

  async shield(root, path, mode): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    const existing = await readGeminiIgnore(root);
    const merged = mergeIgnoreSection(existing, [normalizedPath]);
    await writeGeminiIgnore(root, merged);
    await upsertSessionShieldEntry(root, {
      path: normalizedPath,
      mode,
      provider: "gemini",
      shieldedAt: new Date().toISOString(),
    });

    return {
      path: normalizedPath,
      mode,
      effectiveness: capabilities.effectiveness,
      modifiedFiles: [GEMINI_IGNORE, SESSION_SHIELD_PATH],
      shielded: true,
    };
  },

  async unshield(root, path): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    const existing = await readGeminiIgnore(root);
    const updated = removePathFromIgnoreSection(existing, normalizedPath);
    const modifiedFiles: string[] = [SESSION_SHIELD_PATH];

    if (updated !== existing) {
      await writeGeminiIgnore(root, updated);
      modifiedFiles.push(GEMINI_IGNORE);
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
