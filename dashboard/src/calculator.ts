import type { TokenRiskTotals } from "@tokenforge/risk-core";

export const SAVED_PERCENT_DIGITS = 1;

/**
 * Placeholder BU totals until #19 loads demo-seed.json.
 * 886788 / 2955959 = 30.0% token exclusion (one decimal).
 */
export const DEMO_TOTALS: TokenRiskTotals = {
  beforeTokens: 2_955_959,
  afterTokens: 2_069_171,
  savedTokens: 886_788,
};

export type Assumptions = {
  /** Vendor-neutral list price, not a billing API. */
  usdPerMillionTokens: number;
  teamSize: number;
  msgsPerDevPerDay: number;
  daysPerMonth: number;
  tokensPerMessage: number;
  /** 0–1 share of traffic on a higher-cost model. */
  premiumShare: number;
  /** Premium model costs this × the base rate. */
  premiumMultiplier: number;
  /**
   * 0–1 share of billed Chat/Agent usage this waste class applies to.
   * 1 = display the scan’s exclusion ratio; 0.3 ≈ pitch 30% on a 99.8% fixture.
   */
  realizedWasteShare: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  usdPerMillionTokens: 15,
  teamSize: 40,
  msgsPerDevPerDay: 25,
  daysPerMonth: 21,
  tokensPerMessage: 12_000,
  premiumShare: 0.2,
  premiumMultiplier: 4,
  realizedWasteShare: 1,
};

export type Projection = {
  monthlyTokensBefore: number;
  blendedUsdPerMillion: number;
  monthlyUsdBefore: number;
  monthlyUsdAfter: number;
  monthlyUsdSaved: number;
  tokenSavedPercent: number;
  scenarioSavedPercent: number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function roundPercent(ratio: number): number {
  const factor = 10 ** SAVED_PERCENT_DIGITS;
  return Math.round(ratio * 100 * factor) / factor;
}

/** Scan exclusion ratio, one decimal. Not the pitch 30%. */
export function tokenSavedPercent(totals: TokenRiskTotals): number {
  if (totals.beforeTokens <= 0) {
    return 0;
  }
  return roundPercent(totals.savedTokens / totals.beforeTokens);
}

/** Pitch figure: exclusion × applicability share. */
export function scenarioSavedPercent(
  totals: TokenRiskTotals,
  assumptions: Assumptions,
): number {
  if (totals.beforeTokens <= 0) {
    return 0;
  }
  const raw = totals.savedTokens / totals.beforeTokens;
  return roundPercent(raw * clamp01(assumptions.realizedWasteShare));
}

export function blendedUsdPerMillion(assumptions: Assumptions): number {
  const premiumShare = clamp01(assumptions.premiumShare);
  return (
    assumptions.usdPerMillionTokens *
    (1 - premiumShare + premiumShare * assumptions.premiumMultiplier)
  );
}

export function projectSavings(
  totals: TokenRiskTotals,
  assumptions: Assumptions,
): Projection {
  const monthlyTokensBefore =
    assumptions.teamSize *
    assumptions.msgsPerDevPerDay *
    assumptions.daysPerMonth *
    assumptions.tokensPerMessage;
  const rate = blendedUsdPerMillion(assumptions);
  const monthlyUsdBefore = (monthlyTokensBefore / 1_000_000) * rate;
  const scenarioRatio = scenarioSavedPercent(totals, assumptions) / 100;
  const monthlyUsdSaved = monthlyUsdBefore * scenarioRatio;

  return {
    monthlyTokensBefore,
    blendedUsdPerMillion: rate,
    monthlyUsdBefore,
    monthlyUsdAfter: monthlyUsdBefore - monthlyUsdSaved,
    monthlyUsdSaved,
    tokenSavedPercent: tokenSavedPercent(totals),
    scenarioSavedPercent: scenarioSavedPercent(totals, assumptions),
  };
}

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(SAVED_PERCENT_DIGITS)}%`;
}

export function formatTokens(value: number): string {
  return value.toLocaleString("en-US");
}
