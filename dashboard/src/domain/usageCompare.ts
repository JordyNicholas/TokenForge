/**
 * Baseline vs after-Fix period compare for Prove (#86).
 * Local/imported billed usage + scan estimate — not live vendor sync.
 */
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import type { Assumptions } from "./assumptions";
import { projectSavings } from "./calculator";
import { usageForTeam, type UsageMetrics } from "./usage";

export type UsagePeriodSlice = {
  creditsUsed: number;
  estimatedUsd: number;
  period: string;
  providerLabel: string;
};

export type UsagePeriodCompare = {
  baseline: UsagePeriodSlice;
  after: UsagePeriodSlice;
  /** Projected $ reduction from the baseline scan × current assumptions. */
  estimatedUsdReduction: number;
  /** Baseline billed $ − after billed $ (positive = bill went down). */
  actualBilledChange: number;
  /** actualBilledChange − estimatedUsdReduction. */
  varianceUsd: number;
  periodMismatch: boolean;
  providerMismatch: boolean;
};

export function usagePeriodSlice(
  usage: UsageMetrics,
  teamId: string | null,
): UsagePeriodSlice | null {
  const slice = usageForTeam(usage, teamId);
  if (!slice) {
    return null;
  }
  return {
    creditsUsed: slice.creditsUsed,
    estimatedUsd: slice.estimatedUsd,
    period: usage.period,
    providerLabel: usage.providerLabel,
  };
}

/**
 * Three Prove KPIs for a baseline/after usage pair.
 * Estimated reduction uses the baseline (or active) scan totals and live assumptions;
 * freezing those knobs is #87.
 */
export function compareUsagePeriods(input: {
  baselineUsage: UsageMetrics;
  afterUsage: UsageMetrics;
  teamId: string | null;
  baselineTotals: TokenRiskTotals;
  assumptions: Assumptions;
}): UsagePeriodCompare | null {
  const baseline = usagePeriodSlice(input.baselineUsage, input.teamId);
  const after = usagePeriodSlice(input.afterUsage, input.teamId);
  if (!baseline || !after) {
    return null;
  }
  const estimatedUsdReduction = projectSavings(
    input.baselineTotals,
    input.assumptions,
  ).monthlyUsdSaved;
  const actualBilledChange = baseline.estimatedUsd - after.estimatedUsd;
  return {
    baseline,
    after,
    estimatedUsdReduction,
    actualBilledChange,
    varianceUsd: actualBilledChange - estimatedUsdReduction,
    periodMismatch: baseline.period !== after.period,
    providerMismatch: baseline.providerLabel !== after.providerLabel,
  };
}
