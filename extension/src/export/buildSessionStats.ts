import type {
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
};

export function buildSessionStatsReport(input: BuildSessionStatsInput): SessionStatsReport {
  return {
    source: "extension",
    timestamp: input.timestamp,
    repo: input.repo,
    team: input.team,
    sessionAvoidedTokens: input.sessionAvoidedTokens,
    sessionHistory: input.sessionHistory.map(toHistoryEntry),
  };
}

function toHistoryEntry(entry: SessionLedgerEntry): SessionStatsHistoryEntry {
  return {
    path: entry.path,
    estTokens: entry.estTokens,
    reason: entry.reason,
    filteredAt: new Date(entry.filteredAt).toISOString(),
  };
}
