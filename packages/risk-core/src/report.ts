import type {
  FindingAction,
  FindingReason,
  ProviderId,
  ScanSource,
  TokenRiskFinding,
  TokenRiskReport,
  TokenRiskTotals,
} from "./types";

const SOURCES = new Set<ScanSource>(["extension", "cli"]);
const PROVIDERS = new Set<ProviderId>([
  "copilot",
  "cursor",
  "claude",
  "generic",
]);
const REASONS = new Set<FindingReason>([
  "inactive_tab",
  "high_risk_filetype",
  "oversized",
]);
const ACTIONS = new Set<FindingAction>(["filtered", "excluded", "kept"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFinding(value: unknown): value is TokenRiskFinding {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.path === "string" &&
    value.path.length > 0 &&
    typeof value.reason === "string" &&
    REASONS.has(value.reason as FindingReason) &&
    isNonNegativeInt(value.bytes) &&
    isNonNegativeInt(value.estTokens) &&
    typeof value.action === "string" &&
    ACTIONS.has(value.action as FindingAction)
  );
}

function isTotals(value: unknown): value is TokenRiskTotals {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isNonNegativeInt(value.beforeTokens) &&
    isNonNegativeInt(value.afterTokens) &&
    isNonNegativeInt(value.savedTokens)
  );
}

/** Runtime guard aligned with `docs/schemas/risk-event.schema.json`. */
export function isTokenRiskReport(value: unknown): value is TokenRiskReport {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.source === "string" &&
    SOURCES.has(value.source as ScanSource) &&
    typeof value.timestamp === "string" &&
    value.timestamp.length > 0 &&
    typeof value.repo === "string" &&
    value.repo.length > 0 &&
    typeof value.team === "string" &&
    value.team.length > 0 &&
    typeof value.provider === "string" &&
    PROVIDERS.has(value.provider as ProviderId) &&
    Array.isArray(value.findings) &&
    value.findings.every(isFinding) &&
    isTotals(value.totals)
  );
}
