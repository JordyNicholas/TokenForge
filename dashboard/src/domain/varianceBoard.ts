/**
 * Manager-facing variance board rows (#93).
 * Baseline vs after billed usage × per-team scan estimates — not live pipeline metering.
 */
import type { TokenRiskReport, TokenRiskTotals } from "@tokenforge/risk-core";
import { aggregateTotals } from "./seed";
import type { Assumptions } from "./assumptions";
import { compareUsagePeriods, type UsagePeriodCompare } from "./usageCompare";
import type { UsageMetrics } from "./usage";
import { formatGapPercent, varianceGapPercent } from "./varianceGap";

export type VarianceBoardRow = {
  team: string;
  baselineUsd: number;
  afterUsd: number;
  estimatedReductionUsd: number;
  actualBilledChangeUsd: number;
  varianceUsd: number;
  gapPercent: number | null;
  gapPercentLabel: string;
  /** True when usage or scan data is incomplete for this row. */
  incomplete: boolean;
};

export type VarianceBoard = {
  baselinePeriod: string;
  afterPeriod: string;
  providerLabel: string;
  periodMismatch: boolean;
  providerMismatch: boolean;
  assumptionsFrozen: boolean;
  liveAssumptionsDrift: boolean;
  rows: VarianceBoardRow[];
  bu: VarianceBoardRow;
};

function rowFromCompare(
  team: string,
  compare: UsagePeriodCompare | null,
): VarianceBoardRow {
  if (!compare) {
    return {
      team,
      baselineUsd: 0,
      afterUsd: 0,
      estimatedReductionUsd: 0,
      actualBilledChangeUsd: 0,
      varianceUsd: 0,
      gapPercent: null,
      gapPercentLabel: "—",
      incomplete: true,
    };
  }
  const gapPercent = compare.gapPercent;
  return {
    team,
    baselineUsd: compare.baseline.estimatedUsd,
    afterUsd: compare.after.estimatedUsd,
    estimatedReductionUsd: compare.estimatedUsdReduction,
    actualBilledChangeUsd: compare.actualBilledChange,
    varianceUsd: compare.varianceUsd,
    gapPercent,
    gapPercentLabel: formatGapPercent(gapPercent),
    incomplete: false,
  };
}

function compareForTeam(
  baselineUsage: UsageMetrics,
  afterUsage: UsageMetrics,
  teamId: string | null,
  baselineTotals: TokenRiskTotals,
  liveAssumptions: Assumptions,
  frozenAssumptions?: Assumptions | null,
): UsagePeriodCompare | null {
  return compareUsagePeriods({
    baselineUsage,
    afterUsage,
    teamId,
    baselineTotals,
    liveAssumptions,
    frozenAssumptions,
  });
}

/** Sorted period keys from registered usage snapshots. */
export function listUsagePeriods(snapshots: Record<string, UsageMetrics>): string[] {
  return Object.keys(snapshots).sort((a, b) => b.localeCompare(a));
}

/**
 * Build BU + team variance rows for the selected baseline/after usage periods.
 */
export function buildVarianceBoard(input: {
  baselineUsage: UsageMetrics;
  afterUsage: UsageMetrics;
  reports: TokenRiskReport[];
  liveAssumptions: Assumptions;
  frozenAssumptions?: Assumptions | null;
}): VarianceBoard {
  const buTotals = aggregateTotals(input.reports);
  const buCompare = compareForTeam(
    input.baselineUsage,
    input.afterUsage,
    null,
    buTotals,
    input.liveAssumptions,
    input.frozenAssumptions,
  );

  const teamNames = [
    ...new Set([
      ...input.reports.map((report) => report.team),
      ...input.baselineUsage.teams.map((row) => row.team),
      ...input.afterUsage.teams.map((row) => row.team),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const totalsByTeam = new Map(
    input.reports.map((report) => [report.team, report.totals] as const),
  );

  const rows = teamNames.map((team) => {
    const compare = compareForTeam(
      input.baselineUsage,
      input.afterUsage,
      team,
      totalsByTeam.get(team) ?? buTotals,
      input.liveAssumptions,
      input.frozenAssumptions,
    );
    return rowFromCompare(team, compare);
  });

  const bu = rowFromCompare(
    input.reports.length === 1 ? input.reports[0]!.team : "Business unit",
    buCompare,
  );
  bu.team =
    input.reports.length === 1 ? `${input.reports[0]!.team} (BU roll-up)` : "Business unit";

  return {
    baselinePeriod: input.baselineUsage.period,
    afterPeriod: input.afterUsage.period,
    providerLabel: input.baselineUsage.providerLabel,
    periodMismatch: input.baselineUsage.period !== input.afterUsage.period,
    providerMismatch:
      input.baselineUsage.providerLabel !== input.afterUsage.providerLabel,
    assumptionsFrozen: Boolean(input.frozenAssumptions),
    liveAssumptionsDrift: buCompare?.liveAssumptionsDrift ?? false,
    rows,
    bu,
  };
}

/** Register or replace a period-scoped usage snapshot. */
export function upsertUsageSnapshot(
  snapshots: Record<string, UsageMetrics>,
  usage: UsageMetrics,
): Record<string, UsageMetrics> {
  return { ...snapshots, [usage.period]: usage };
}

/** Pick default after period: newest period after baseline, else any other period. */
export function defaultAfterPeriod(
  snapshots: Record<string, UsageMetrics>,
  baselinePeriod: string,
): string | null {
  const periods = listUsagePeriods(snapshots).filter((period) => period !== baselinePeriod);
  if (periods.length === 0) {
    return null;
  }
  const afterBaseline = periods.filter((period) => period > baselinePeriod);
  return (afterBaseline[0] ?? periods[0]) ?? null;
}

export { varianceGapPercent, formatGapPercent };
