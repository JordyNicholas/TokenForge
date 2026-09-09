export {
  COPILOT_CANONICAL_INSTRUCTIONS_PATH,
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  GENERIC_EXCLUSIONS_PATH,
  GENERIC_INSTRUCTIONS_PATH,
  MAX_INSTRUCTION_BYTES,
  exclusionPathForProvider,
  instructionPathForProvider,
  instructionTitleForProvider,
} from "./limits";
export { collapseExclusionPaths } from "./exclusions";
export {
  CLAUDE_CANONICAL_INSTRUCTIONS_PATH,
  CLAUDE_EXCLUSIONS_PATH,
  CLAUDE_INSTRUCTIONS_PATH,
  claudeAdapter,
} from "./claude/claude";
export { copilotAdapter } from "./copilot/copilot";
export {
  CURSOR_EXCLUSIONS_PATH,
  CURSOR_IGNORE_CANDIDATES_PATH,
  CURSOR_INSTRUCTIONS_PATH,
  cursorAdapter,
} from "./cursor/cursor";
export {
  CURSOR_RULES_DIR,
  CURSOR_SCOPED_RULE_PREFIX,
  cursorScopedRulePath,
  isCursorScopedRulePath,
  renderCursorScopedRules,
} from "./cursor/scoped-rules";
export {
  GEMINI_EXCLUSIONS_PATH,
  GEMINI_INSTRUCTIONS_PATH,
  geminiAdapter,
} from "./gemini/gemini";
export { genericAdapter } from "./generic/generic";
export { getAdapter } from "./registry";
export { collectKeptContent } from "./keep-dirs";
export type { KeptContent } from "./keep-dirs";
export type { PolicyFile, PolicyRenderContext, PolicyWriteMode, ProviderAdapter } from "./types";
export {
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
  mergeTokenForgeSection,
  wrapTokenForgeSection,
} from "./section-merge";
