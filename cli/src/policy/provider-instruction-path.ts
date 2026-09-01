import type { ProviderId } from "@tokenforge/risk-core";
import { CLAUDE_INSTRUCTIONS_PATH } from "../adapters/claude/claude";
import {
  COPILOT_INSTRUCTIONS_PATH,
  GENERIC_INSTRUCTIONS_PATH,
} from "../adapters/limits";
import { CURSOR_INSTRUCTIONS_PATH } from "../adapters/cursor/cursor";

export function instructionPathForProvider(provider: ProviderId): string {
  if (provider === "copilot") {
    return COPILOT_INSTRUCTIONS_PATH;
  }
  if (provider === "claude") {
    return CLAUDE_INSTRUCTIONS_PATH;
  }
  if (provider === "cursor") {
    return CURSOR_INSTRUCTIONS_PATH;
  }
  return GENERIC_INSTRUCTIONS_PATH;
}

export function instructionTitleForProvider(provider: ProviderId): string {
  if (provider === "copilot") {
    return "Copilot instructions (TokenForge)";
  }
  if (provider === "claude") {
    return "Claude / Codex instructions (TokenForge)";
  }
  if (provider === "cursor") {
    return "Cursor rules (TokenForge)";
  }
  return "TokenForge instructions (generic)";
}
