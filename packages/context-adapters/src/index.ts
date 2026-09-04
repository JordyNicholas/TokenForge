export type {
  ContextCapabilities,
  ContextProviderId,
  EffectivenessTier,
  ProviderContextAdapter,
  SessionShieldEntry,
  SessionShieldFile,
  ShieldMode,
  ShieldResult,
} from "./types.js";

export {
  TOKENFORGE_IGNORE_BEGIN,
  TOKENFORGE_IGNORE_END,
  mergeIgnoreSection,
  normalizeIgnorePattern,
  removePathFromIgnoreSection,
} from "./ignore-merge.js";

export {
  SESSION_SHIELD_PATH,
  readSessionShield,
  removeSessionShieldEntry,
  upsertSessionShieldEntry,
  writeSessionShield,
} from "./session-shield-file.js";

export { genericContextAdapter } from "./generic.js";
export { cursorContextAdapter } from "./cursor.js";
export { copilotContextAdapter } from "./copilot.js";
export { geminiContextAdapter } from "./gemini.js";
export { claudeContextAdapter } from "./claude.js";

export {
  type DetectContextProviderHints,
  detectContextProvider,
  getContextAdapter,
} from "./registry.js";
