import { isLlmAnalysisOverview } from "../advise/overview";
import { isFindingSuggestion } from "../advise/suggest";
import type {
  FindingAction,
  FindingReason,
  FindingSource,
  LlmBackendId,
  ProviderId,
  ScanLayer,
  ScanLayerId,
  ScanLayers,
  ScanMetadata,
  ScanMode,
  ScanSource,
  TokenRiskFinding,
  TokenRiskReport,
  TokenRiskTotals,
} from "../domain/types";

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
  "semantic_bloat",
  "redundant_instructions",
  "low_signal_config",
  "duplicate_logic",
  "redundant_config",
]);
const ACTIONS = new Set<FindingAction>(["filtered", "excluded", "kept"]);
const FINDING_SOURCES = new Set<FindingSource>(["heuristic", "llm", "combined"]);
const SCAN_LAYER_IDS = new Set<ScanLayerId>(["heuristic", "llm", "combined"]);
const SCAN_MODES = new Set<ScanMode>(["heuristic", "hybrid"]);
const LLM_BACKENDS = new Set<LlmBackendId>([
  "noop",
  "ollama",
  "codex",
  "anthropic",
  "claude-code",
  "gemini-cli",
  "cursor-cli",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isFinding(value: unknown): value is TokenRiskFinding {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.path !== "string" ||
    value.path.length === 0 ||
    typeof value.reason !== "string" ||
    !REASONS.has(value.reason as FindingReason) ||
    !isNonNegativeInt(value.bytes) ||
    !isNonNegativeInt(value.estTokens) ||
    typeof value.action !== "string" ||
    !ACTIONS.has(value.action as FindingAction)
  ) {
    return false;
  }
  if (value.source !== undefined && !FINDING_SOURCES.has(value.source as FindingSource)) {
    return false;
  }
  if (value.confidence !== undefined && !isUnitInterval(value.confidence)) {
    return false;
  }
  if (value.detail !== undefined && typeof value.detail !== "string") {
    return false;
  }
  if (value.suggestion !== undefined && !isFindingSuggestion(value.suggestion)) {
    return false;
  }
  return true;
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

function isScanLayer(value: unknown): value is ScanLayer {
  if (!isRecord(value)) {
    return false;
  }
  return (
    Array.isArray(value.findings) &&
    value.findings.every(isFinding) &&
    isTotals(value.totals)
  );
}

function isScanLayers(value: unknown): value is ScanLayers {
  if (!isRecord(value)) {
    return false;
  }
  for (const layerId of SCAN_LAYER_IDS) {
    if (!isScanLayer(value[layerId])) {
      return false;
    }
  }
  return true;
}

function isScanMetadata(value: unknown): value is ScanMetadata {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.mode !== "string" || !SCAN_MODES.has(value.mode as ScanMode)) {
    return false;
  }
  if (value.llm === undefined) {
    return true;
  }
  if (!isRecord(value.llm)) {
    return false;
  }
  return (
    typeof value.llm.backend === "string" &&
    LLM_BACKENDS.has(value.llm.backend as LlmBackendId) &&
    typeof value.llm.model === "string" &&
    value.llm.model.length > 0 &&
    (value.llm.endpoint === undefined || typeof value.llm.endpoint === "string") &&
    typeof value.llm.durationMs === "number" &&
    Number.isFinite(value.llm.durationMs) &&
    value.llm.durationMs >= 0 &&
    isNonNegativeInt(value.llm.candidatesSent) &&
    (value.llm.analysisOverview === undefined ||
      isLlmAnalysisOverview(value.llm.analysisOverview))
  );
}

function isActivePaths(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.length > 0)
  );
}

/** Runtime guard aligned with `docs/schemas/risk-event.schema.json`. */
export function isTokenRiskReport(value: unknown): value is TokenRiskReport {
  if (!isRecord(value)) {
    return false;
  }
  if (value.scan !== undefined && !isScanMetadata(value.scan)) {
    return false;
  }
  if (value.layers !== undefined && !isScanLayers(value.layers)) {
    return false;
  }
  if (value.activePaths !== undefined && !isActivePaths(value.activePaths)) {
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
