export {
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  GENERIC_EXCLUSIONS_PATH,
  GENERIC_INSTRUCTIONS_PATH,
  MAX_INSTRUCTION_BYTES,
} from "./limits";
export { copilotAdapter } from "./copilot";
export { genericAdapter } from "./generic";
export { getAdapter } from "./registry";
export type { PolicyFile, ProviderAdapter } from "./types";
