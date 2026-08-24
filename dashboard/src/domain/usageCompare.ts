/**
 * Baseline vs after-Fix period compare for Prove (#86 + #87 freeze).
 * Local/imported billed usage + scan estimate — not live vendor sync.
 */
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  assumptionsEqual,
  cloneAssumptions,
  type Assumptions,
} from "./assumptions";
import { projectSavings } from "./calculator";
import { usageForTeam, type UsageMetrics } from "./usage";
import { varianceGapPercent } from "./varianceGap";

export type UsagePeriodSlice = {
  creditsUsed: number;
  estimatedUsd: number;
  period: string;
  providerLabel: string;
};

export type UsagePeriodCompare = {
  baseline: UsagePeriodSlice;
  after: UsagePeriodSlice;
  /** Projected $ reduction from the baseline scan × frozen (or live) assumptions. */
  estimatedUsdReduction: number;
  /** Baseline billed $ − after billed $ (positive = bill went down). */
  actualBilledChange: number;
  /** actualBilledChange − estimatedUsdReduction. */
  varianceUsd: number;
  /** Variance as % of estimated reduction; null when estimate is zero. */
  gapPercent: number | null;
  periodMismatch: boolean;
  providerMismatch: boolean;
  /** Assumptions used for estimated $ (prefer freeze when present). */
  assumptionsUsed: Assumptions;
  assumptionsFrozen: boolean;
  /** True when live knobs differ from the freeze used for estimate $. */
  liveAssumptionsDrift: boolean;
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
 * Estimated reduction prefers a frozen Assumptions snapshot (#87) so edited knobs
 * cannot silently rewrite a saved compare run.
 */
export function compareUsagePeriods(input: {
  baselineUsage: UsageMetrics;
  afterUsage: UsageMetrics;
  teamId: string | null;
  baselineTotals: TokenRiskTotals;
  /** Live Assumptions panel values. */
  liveAssumptions: Assumptions;
  /** Snapshot frozen when the compare run was saved; null → use live. */
  frozenAssumptions?: Assumptions | null;
}): UsagePeriodCompare | null {
  const baseline = usagePeriodSlice(input.baselineUsage, input.teamId);
  const after = usagePeriodSlice(input.afterUsage, input.teamId);
  if (!baseline || !after) {
    return null;
  }
  const assumptionsFrozen = Boolean(input.frozenAssumptions);
  const assumptionsUsed = cloneAssumptions(
    input.frozenAssumptions ?? input.liveAssumptions,
  );
  const estimatedUsdReduction = projectSavings(
    input.baselineTotals,
    assumptionsUsed,
  ).monthlyUsdSaved;
  const actualBilledChange = baseline.estimatedUsd - after.estimatedUsd;
  const varianceUsd = actualBilledChange - estimatedUsdReduction;
  return {
    baseline,
    after,
    estimatedUsdReduction,
    actualBilledChange,
    varianceUsd,
    gapPercent: varianceGapPercent(varianceUsd, estimatedUsdReduction),
    periodMismatch: baseline.period !== after.period,
    providerMismatch: baseline.providerLabel !== after.providerLabel,
    assumptionsUsed,
    assumptionsFrozen,
    liveAssumptionsDrift: assumptionsFrozen
      ? !assumptionsEqual(assumptionsUsed, input.liveAssumptions)
      : false,
  };
}
