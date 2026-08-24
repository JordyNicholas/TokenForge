import { totalsFromUsageTeams, type UsageMetrics } from "@tokenforge/risk-core";
import { UsageError } from "../app/errors";

/** Narrow UsageMetrics to one team row and recompute totals. */
export function applyTeamScope(metrics: UsageMetrics, teamScope: string): UsageMetrics {
  const teams = metrics.teams.filter((row) => row.team === teamScope);
  if (teams.length === 0) {
    throw new UsageError(
      `Usage has no team "${teamScope}" for period ${metrics.period}.`,
    );
  }
  return {
    ...metrics,
    teams,
    totals: totalsFromUsageTeams(teams),
  };
}
