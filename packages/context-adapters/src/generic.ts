import type {
  ContextCapabilities,
  ProviderContextAdapter,
  ShieldMode,
  ShieldResult,
} from "./types.js";
import {
  removeSessionShieldEntry,
  SESSION_SHIELD_PATH,
  upsertSessionShieldEntry,
} from "./session-shield-file.js";
import { normalizeIgnorePattern } from "./ignore-merge.js";

const capabilities: ContextCapabilities = {
  id: "generic",
  displayName: "Generic",
  effectiveness: "advisory",
  supportsSoftShield: true,
  supportsHardShield: true,
};

/** Advisory-only adapter: records shields in session-shield.json without provider ignore files. */
export const genericContextAdapter: ProviderContextAdapter = {
  id: "generic",
  capabilities,

  async shield(root, path, mode): Promise<ShieldResult> {
    const normalizedPath = normalizeIgnorePattern(path);
    await upsertSessionShieldEntry(root, {
      path: normalizedPath,
      mode,
      provider: "generic",
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
      mode: "soft",
      effectiveness: capabilities.effectiveness,
      modifiedFiles: [SESSION_SHIELD_PATH],
      shielded: false,
    };
  },
};
