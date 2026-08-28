import type {
  SessionAdoptionSnapshot,
  SessionStatsHistoryEntry,
  SessionStatsReport,
} from "@tokenforge/risk-core";
import type { SessionLedgerEntry } from "../session/sessionLedger";

export type BuildSessionStatsInput = {
  repo: string;
  team: string;
  timestamp: string;
  sessionAvoidedTokens: number;
  sessionHistory: readonly SessionLedgerEntry[];
  adoption?: SessionAdoptionSnapshot;
};

export function buildSessionStatsReport(input: BuildSessionStatsInput): SessionStatsReport {
  const report: SessionStatsReport = {
    source: "extension",
    timestamp: input.timestamp,
    repo: input.repo,
    team: input.team,
    sessionAvoidedTokens: input.sessionAvoidedTokens,
    sessionHistory: input.sessionHistory.map(toHistoryEntry),
    filterEventCount: input.sessionHistory.length,
  };

  if (input.adoption !== undefined && input.adoption.filteredPercent !== null) {
    report.atRiskTabsFilteredPercent = input.adoption.filteredPercent;
  }

  return report;
}

function toHistoryEntry(entry: SessionLedgerEntry): SessionStatsHistoryEntry {
  return {
    path: entry.path,
    estTokens: entry.estTokens,
    reason: entry.reason,
    filteredAt: new Date(entry.filteredAt).toISOString(),
  };
}
