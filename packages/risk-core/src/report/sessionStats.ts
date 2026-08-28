import type { FindingReason, SessionStatsReport } from "../domain/types";

const REASONS = new Set<FindingReason>([
  "inactive_tab",
  "high_risk_filetype",
  "oversized",
  "semantic_bloat",
  "redundant_instructions",
  "low_signal_config",
  "duplicate_logic",
  "redundant_config",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isHistoryEntry(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.path === "string" &&
    value.path.length > 0 &&
    isNonNegativeInt(value.estTokens) &&
    typeof value.reason === "string" &&
    REASONS.has(value.reason as FindingReason) &&
    typeof value.filteredAt === "string" &&
    value.filteredAt.length > 0
  );
}

function isOptionalFilteredPercent(value: unknown): value is number | undefined {
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 100)
  );
}

export function isSessionStatsReport(value: unknown): value is SessionStatsReport {
  if (!isRecord(value)) {
    return false;
  }
  if (
    value.source !== "extension" ||
    typeof value.timestamp !== "string" ||
    value.timestamp.length === 0 ||
    typeof value.repo !== "string" ||
    value.repo.length === 0 ||
    typeof value.team !== "string" ||
    value.team.length === 0 ||
    !isNonNegativeInt(value.sessionAvoidedTokens) ||
    !Array.isArray(value.sessionHistory) ||
    !isOptionalFilteredPercent(value.atRiskTabsFilteredPercent) ||
    (value.filterEventCount !== undefined && !isNonNegativeInt(value.filterEventCount))
  ) {
    return false;
  }
  return value.sessionHistory.every(isHistoryEntry);
}
