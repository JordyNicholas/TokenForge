/** Token Risk JSON contract (v0) plus kernel scoring types. */

export type ScanSource = "extension" | "cli";

/** Fix adapter that produced (or will produce) policy files. Scoring ignores this. */
export type ProviderId = "copilot" | "cursor" | "claude" | "generic";

export type FindingReason =
  | "inactive_tab"
  | "high_risk_filetype"
  | "oversized"
  | "semantic_bloat"
  | "redundant_instructions"
  | "low_signal_config";

export type FindingAction = "filtered" | "excluded" | "kept";

/** How a finding was produced when hybrid scan is enabled. */
export type FindingSource = "heuristic" | "llm" | "combined";

/**
 * Advisory next step for a developer. TokenForge never applies this
 * (not policy-pack Fix, and not a source-file write).
 */
export type SuggestionKind =
  | "exclude_from_context"
  | "trim_instructions"
  | "dedupe_rules"
  | "add_ignore"
  | "review";

export type FindingSuggestion = {
  kind: SuggestionKind;
  summary: string;
};

/** CLI scan mode. Default MVP path is heuristic-only. */
export type ScanMode = "heuristic" | "hybrid";

/** LLM enricher backend identifiers (CLI adapters). */
export type LlmBackendId = "noop" | "ollama" | "codex" | "anthropic";

export type FiletypeRiskClass =
  | "lockfile"
  | "generated"
  | "config"
  | "source"
  | "unknown";

export type RiskInput = {
  path: string;
  bytes: number;
  inactiveMs: number;
  /**
   * Idle threshold before `inactive_tab` fires.
   * Defaults to {@link INACTIVE_MS} (focused). Pass {@link BACKGROUND_INACTIVE_MS}
   * for non-focused editor tabs.
   */
  inactiveThresholdMs?: number;
};

export type RiskAssessment = {
  path: string;
  bytes: number;
  estTokens: number;
  fileClass: FiletypeRiskClass;
  /** Integer 0–100. Mix of filetype class, size, and inactivity. */
  score: number;
  atRisk: boolean;
  reasons: FindingReason[];
};

export type TokenRiskFinding = {
  path: string;
  reason: FindingReason;
  bytes: number;
  estTokens: number;
  action: FindingAction;
  /** Present when hybrid enrichment ran; omitted for pure heuristic scans. */
  source?: FindingSource;
  /** LLM confidence 0–1 when `source` is `llm` or `combined`. */
  confidence?: number;
  /** Human-readable LLM explanation. */
  detail?: string;
  /** Optional copy-only advice. Never applied by TokenForge. */
  suggestion?: FindingSuggestion;
};

export type ScanLlmMetadata = {
  backend: LlmBackendId;
  model: string;
  endpoint?: string;
  durationMs: number;
  candidatesSent: number;
};

export type ScanMetadata = {
  mode: ScanMode;
  llm?: ScanLlmMetadata;
};

export type ScanLayerId = "heuristic" | "llm" | "combined";

export type ScanLayer = {
  findings: TokenRiskFinding[];
  totals: TokenRiskTotals;
};

/** Separated Detect layers; `combined` mirrors top-level findings/totals for Fix. */
export type ScanLayers = Record<ScanLayerId, ScanLayer>;

export type TokenRiskTotals = {
  beforeTokens: number;
  afterTokens: number;
  savedTokens: number;
};

/**
 * Shared Detect/Fix → Prove document (`.tokenforge/scan-report.json`).
 * JSON Schema: `docs/schemas/risk-event.schema.json` (`TOKEN_RISK_REPORT_SCHEMA_ID`).
 */
export type TokenRiskReport = {
  source: ScanSource;
  timestamp: string;
  repo: string;
  team: string;
  provider: ProviderId;
  findings: TokenRiskFinding[];
  totals: TokenRiskTotals;
  /** Optional hybrid-scan metadata; omitted for heuristic-only reports. */
  scan?: ScanMetadata;
  /** Separated heuristic / LLM / combined results when hybrid scan ran. */
  layers?: ScanLayers;
};
