import type {
  ContextCapabilities,
  ProviderContextAdapter,
  ShieldMode,
  ShieldResult,
} from "./types.js";
import { normalizeIgnorePattern } from "./ignore-merge.js";
import {
  removeSessionShieldEntry,
  SESSION_SHIELD_PATH,
  upsertSessionShieldEntry,
} from "./session-shield-file.js";

const capabilities: ContextCapabilities = {
  id: "claude",
  displayName: "Claude / Codex",
  /** No verified Claude Code ignore file — advisory session-shield only. */
  effectiveness: "advisory",
  supportsSoftShield: true,
  supportsHardShield: true,
};

/**
 * Claude advisory adapter: records shields in session-shield.json only.
 * Policy Fix still merges instruction sections into CLAUDE.md via apply.
 */
export const claudeContextAdapter: ProviderContextAdapter = {
  id: "claude",
  capabilities,

  async shield(root, path, mode): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    await upsertSessionShieldEntry(root, {
      path: normalizedPath,
      mode,
      provider: "claude",
      shieldedAt: new Date().toISOString(),
    });

    return {
      path: normalizedPath,
      mode,
      effectiveness: capabilities.effectiveness,
      modifiedFiles: [SESSION_SHIELD_PATH],
      shielded: true,
    };
  },

  async unshield(root, path): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    await removeSessionShieldEntry(root, normalizedPath);

    return {
      path: normalizedPath,
      mode: "soft" as ShieldMode,
      effectiveness: capabilities.effectiveness,
      modifiedFiles: [SESSION_SHIELD_PATH],
      shielded: false,
    };
  },
};
