import type { ProviderId } from "@tokenforge/risk-core";
import { UsageError } from "../app/errors";
import { claudeAdapter } from "./claude/claude";
import { copilotAdapter } from "./copilot/copilot";
import { cursorAdapter } from "./cursor/cursor";
import { genericAdapter } from "./generic/generic";
import type { ProviderAdapter } from "./types";

/**
 * Resolve a Fix adapter. Copilot is the apply/init default; cursor/claude/generic
 * write provider-native instruction + exclusion candidate files locally.
 */
export function getAdapter(id: ProviderId): ProviderAdapter {
  if (id === "copilot") {
    return copilotAdapter;
  }
  if (id === "generic") {
    return genericAdapter;
  }
  if (id === "cursor") {
    return cursorAdapter;
  }
  if (id === "claude") {
    return claudeAdapter;
  }
  throw new UsageError(`Unknown provider "${id}".`);
}
