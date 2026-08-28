import type { SessionStatsReport } from "@tokenforge/risk-core";

/** Stable fingerprint for session stats — ignores timestamp-only churn. */
export function sessionStatsFingerprint(report: SessionStatsReport): string {
  return JSON.stringify({
    repo: report.repo,
    team: report.team,
    sessionAvoidedTokens: report.sessionAvoidedTokens,
    sessionHistory: report.sessionHistory,
    atRiskTabsFilteredPercent: report.atRiskTabsFilteredPercent,
    filterEventCount: report.filterEventCount,
  });
}
