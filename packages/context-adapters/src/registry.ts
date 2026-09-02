import { access } from "node:fs/promises";
import { join } from "node:path";
import type { ContextProviderId, ProviderContextAdapter } from "./types.js";
import { copilotContextAdapter } from "./copilot.js";
import { cursorContextAdapter } from "./cursor.js";
import { genericContextAdapter } from "./generic.js";

export type DetectContextProviderHints = {
  /** VS Code / extension knows Copilot is the active agent. */
  copilot?: boolean;
  /** VS Code / extension knows Cursor is the active agent. */
  cursor?: boolean;
};

const adapters: Record<ContextProviderId, ProviderContextAdapter> = {
  generic: genericContextAdapter,
  cursor: cursorContextAdapter,
  copilot: copilotContextAdapter,
};

/** Resolve a provider context adapter by id. */
export function getContextAdapter(id: ContextProviderId): ProviderContextAdapter {
  return adapters[id];
}

async function pathExists(root: string, relativePath: string): Promise<boolean> {
  try {
    await access(join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort provider detection from caller hints and repo markers.
 * Falls back to the generic advisory adapter.
 */
export async function detectContextProvider(
  root: string,
  hints: DetectContextProviderHints = {},
): Promise<ContextProviderId> {
  if (hints.cursor) {
    return "cursor";
  }
  if (hints.copilot) {
    return "copilot";
  }

  const hasCursor =
    (await pathExists(root, ".cursor")) ||
    (await pathExists(root, ".cursorignore")) ||
    (await pathExists(root, ".cursorindexingignore"));

  if (hasCursor) {
    return "cursor";
  }

  const hasCopilot =
    (await pathExists(root, ".copilotignore")) ||
    (await pathExists(root, ".github/copilot-instructions.md"));

  if (hasCopilot) {
    return "copilot";
  }

  return "generic";
}

export { genericContextAdapter, cursorContextAdapter, copilotContextAdapter };
