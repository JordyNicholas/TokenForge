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

const COPILOT_IGNORE = ".copilotignore";

const capabilities: ContextCapabilities = {
  id: "copilot",
  displayName: "GitHub Copilot",
  effectiveness: "partial",
  supportsSoftShield: true,
  supportsHardShield: true,
};

async function readCopilotIgnore(root: string): Promise<string> {
  try {
    return await readFile(join(root, COPILOT_IGNORE), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function writeCopilotIgnore(root: string, contents: string): Promise<void> {
  await writeFile(join(root, COPILOT_IGNORE), contents, "utf8");
}

/**
 * Copilot partial adapter: merges shields into `.copilotignore`.
 * Effectiveness is partial because Copilot may still ingest paths via other channels.
 */
export const copilotContextAdapter: ProviderContextAdapter = {
  id: "copilot",
  capabilities,

  async shield(root, path, mode): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    const existing = await readCopilotIgnore(root);
    const merged = mergeIgnoreSection(existing, [normalizedPath]);
    await writeCopilotIgnore(root, merged);
    await upsertSessionShieldEntry(root, {
      path: normalizedPath,
      mode,
      provider: "copilot",
      shieldedAt: new Date().toISOString(),
    });

    return {
      path: normalizedPath,
      mode,
      effectiveness: capabilities.effectiveness,
      modifiedFiles: [COPILOT_IGNORE, SESSION_SHIELD_PATH],
      shielded: true,
    };
  },

  async unshield(root, path): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    const existing = await readCopilotIgnore(root);
    const updated = removePathFromIgnoreSection(existing, normalizedPath);
    const modifiedFiles: string[] = [SESSION_SHIELD_PATH];

    if (updated !== existing) {
      await writeCopilotIgnore(root, updated);
      modifiedFiles.push(COPILOT_IGNORE);
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
