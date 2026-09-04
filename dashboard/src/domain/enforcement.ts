import type { ProviderId } from "@tokenforge/risk-core";

/** Mirrors packages/context-adapters EffectivenessTier. */
export type EffectivenessTier = "full" | "partial" | "advisory";

/**
 * Enforcement tier labels for dashboard UI.
 * Values mirror packages/context-adapters capabilities (cursor full, copilot partial, else advisory).
 */
const ENFORCEMENT_BY_PROVIDER: Record<ProviderId, EffectivenessTier> = {
  cursor: "full",
  copilot: "partial",
  claude: "advisory",
  gemini: "advisory",
  generic: "advisory",
};

const TIER_LABELS: Record<EffectivenessTier, string> = {
  full: "Shield full",
  partial: "Shield partial",
  advisory: "instructions advisory",
};

export function enforcementTierForProvider(provider: ProviderId): EffectivenessTier {
  return ENFORCEMENT_BY_PROVIDER[provider] ?? "advisory";
}

export function enforcementBadgeLabel(provider: ProviderId): string {
  const tier = enforcementTierForProvider(provider);
  return `${TIER_LABELS[tier]} · ${tier}`;
}

export type EnforcementChipColor = "success" | "warning" | "default";

export function enforcementChipColor(tier: EffectivenessTier): EnforcementChipColor {
  if (tier === "full") {
    return "success";
  }
  if (tier === "partial") {
    return "warning";
  }
  return "default";
}
