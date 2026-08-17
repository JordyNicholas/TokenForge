import type { ProviderId } from "@tokenforge/risk-core";
import { UsageError } from "../errors";
import { copilotAdapter } from "./copilot";
import { genericAdapter } from "./generic";
import type { ProviderAdapter } from "./types";

const STUBBED = new Set<ProviderId>(["cursor", "claude"]);

/**
 * Resolve a Fix adapter. Copilot is the MVP default; cursor/claude are stubs.
 */
export function getAdapter(id: ProviderId): ProviderAdapter {
  if (id === "copilot") {
    return copilotAdapter;
  }
  if (id === "generic") {
    return genericAdapter;
  }
  if (STUBBED.has(id)) {
    throw new UsageError(
      `${id} adapter is stubbed in this MVP. Use --provider copilot (default) or generic.`,
    );
  }
  throw new UsageError(`Unknown provider "${id}".`);
}
