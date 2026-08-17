import type { TokenRiskTotals } from "@tokenforge/risk-core";
import type { Assumptions } from "./assumptions";

export const SAVED_PERCENT_DIGITS = 1;

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
