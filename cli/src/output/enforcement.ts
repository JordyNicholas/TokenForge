import {
  getContextAdapter,
  type ContextProviderId,
  type EffectivenessTier,
} from "@tokenforge/context-adapters";
import type { ProviderId } from "@tokenforge/risk-core";

function contextProviderForPolicy(provider: ProviderId): ContextProviderId {
  if (provider === "cursor") {
    return "cursor";
  }
  if (provider === "copilot") {
    return "copilot";
  }
  return "generic";
}

/** Resolve enforcement tier from context-adapters capabilities. */
export function enforcementTierForProvider(provider: ProviderId): EffectivenessTier {
  return getContextAdapter(contextProviderForPolicy(provider)).capabilities.effectiveness;
}

const TIER_LABELS: Record<EffectivenessTier, string> = {
  full: "Shield full",
  partial: "Shield partial",
  advisory: "instructions advisory",
};

/** One-line badge for Apply / drift CLI output. */
export function formatEnforcementBadge(provider: ProviderId): string {
  const tier = enforcementTierForProvider(provider);
  return `enforcement: ${TIER_LABELS[tier]} (${tier})`;
}
