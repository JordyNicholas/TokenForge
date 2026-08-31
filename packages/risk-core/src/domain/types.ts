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
  | "low_signal_config"
  /**
   * Two or more source paths implementing the same behavior. Advisory only:
   * never pair this with `action: "excluded"` — hiding one copy from agent
   * context is not a fix, since both are still imported and executed.
   */
  | "duplicate_logic"
  /**
   * The config counterpart of {@link duplicate_logic}: the same settings
   * repeated across workspace packages (e.g. a `tsconfig.json` copied per
   * package instead of extending a shared base). Advisory only for the same
   * reason — every package still loads its own copy at build time, so hiding
   * one from agent context fixes nothing. Advice reuses `dedupe_rules`.
   */
  | "redundant_config";

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
  | "review"
  /** Copy-only: consolidate duplicated application code. Never applied by Fix. */
  | "consolidate_duplicates";

export type FindingSuggestion = {
  kind: SuggestionKind;
  summary: string;
};

/** CLI scan mode. Default MVP path is heuristic-only. */
export type ScanMode = "heuristic" | "hybrid";

/**
 * LLM enricher backend identifiers (CLI adapters).
 *
 * `anthropic` and `claude-code` both reach Claude but authenticate differently:
 * `anthropic` calls the Messages API with `ANTHROPIC_API_KEY`, `claude-code`
 * drives the Claude Code CLI on its saved subscription login — the same split
 * as an OpenAI API key versus `codex`.
 */
export type LlmBackendId =
  | "noop"
  | "ollama"
  | "codex"
  | "anthropic"
  | "claude-code"
  | "gemini-cli"
  | "cursor-cli";

export type FiletypeRiskClass =
  | "lockfile"
  | "generated"
  /** CI / unit test output trees (coverage, junit, playwright reports). */
  | "test_output"
  /** Pipeline or build log files — high volume, low signal in agent context. */
  | "ci_log"
  /** Compiled bundles, binary artifacts, and build output dirs. */
  | "build_artifact"
  | "config"
  | "source"
  | "unknown";

/**
 * Why a path is exempt from an exclusion recommendation.
 * Rules live in `protect/protect.ts`; the kind is carried on the assessment
 * so a surface can explain *why* a large file was left alone.
 */
export type ProtectionKind =
  /** Build/lint/flag config an agent needs to reason correctly. */
  | "protected_config"
  /** API or schema contract where size tracks completeness, not waste. */
  | "api_contract"
  /** Generated tree an agent still reads (typed clients, schemas). */
  | "necessary_generated";

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
  /**
   * Set when an exclusion-driving reason was suppressed because the agent
   * needs this path (`protect/protect.ts`). Kernel-side only — the Token Risk
   * JSON contract carries findings, not assessments.
   */
  protection?: ProtectionKind;
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
  /** Optional advice for Prove UX and policy-pack synthesis.
   * Never used to rewrite AGENTS.md / rules sources. */
  suggestion?: FindingSuggestion;
};

/** Bounded LLM narrative for hybrid Prove UX — not a second findings list. */
export type LlmAnalysisOverview = {
  /** 3–6 sentence capsule of what the enricher concluded. */
  summary: string;
  /** Optional short theme tags (e.g. redundant instructions). */
  themes?: string[];
  /** Optional quality caveats (e.g. Pass A flat-batch fallback). */
  caveats?: string[];
};

/** Suggested thin Markdown index for progressive disclosure (#189). */
export type ContextIndexRecommendation = {
  path: string;
  purpose: string;
  summary: string;
};

/** Honest coverage metadata for Codex full-repo audit (#189). */
export type RepoAuditCoverage = {
  mode: "codex_repo_audit";
  filesCopied: number;
  filesSkippedSecret: number;
  filesSkippedHardDir: number;
  bytesCopied: number;
};

export type ScanLlmMetadata = {
  backend: LlmBackendId;
  model: string;
  endpoint?: string;
  durationMs: number;
  candidatesSent: number;
  /** Short Pass C capsule for Prove / dashboard LLM board (optional). */
  analysisOverview?: LlmAnalysisOverview;
  /** Codex repo audit: suggested context indexes (optional, #189). */
  contextIndexRecommendations?: ContextIndexRecommendation[];
  /** Codex repo audit: staged copy coverage (optional, #189). */
  repoAuditCoverage?: RepoAuditCoverage;
};

export type ScanMetadata = {
  mode: ScanMode;
  llm?: ScanLlmMetadata;
  /** Present when `mode` is `hybrid` — layer savings breakdown (#205). */
  hybridDelta?: HybridDelta;
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

/** Heuristic audit of always-on instruction / rules files (#204). */
export type InstructionBudget = {
  alwaysOnTokens: number;
  recommendedMax: number;
  files: Array<{ path: string; estTokens: number }>;
};

export type ComplementarityStatus = "ok" | "llm_empty" | "candidates_skipped";

/** Hybrid layer savings breakdown for Prove / dashboard (#205). */
export type HybridDelta = {
  heuristicSavedTokens: number;
  llmExclusiveSavedTokens: number;
  combinedSavedTokens: number;
  llmFindingCount: number;
  complementarityStatus: ComplementarityStatus;
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
  /**
   * Repo-relative paths the developer had open when this report was produced.
   *
   * A session signal, not a file property: no static rule can tell whether a
   * large locale file is waste without knowing if someone is doing i18n work
   * right now. Exclusion artifacts must never name a path listed here, even
   * when a finding on it says `excluded`.
   *
   * Absent means "unknown", not "none" — omit it rather than writing `[]`
   * when there is no session signal to report.
   */
  activePaths?: string[];
  /** Heuristic instruction-stack audit when instruction paths exist (#204). */
  instructionBudget?: InstructionBudget;
};

/** Extension session Prove handoff — cumulative Filter savings this IDE window. */
export type SessionStatsHistoryEntry = {
  path: string;
  estTokens: number;
  reason: FindingReason;
  filteredAt: string;
};

export type SessionStatsReport = {
  source: "extension";
  timestamp: string;
  repo: string;
  team: string;
  sessionAvoidedTokens: number;
  sessionHistory: SessionStatsHistoryEntry[];
  /** Share of at-risk open tabs marked Filtered when export ran (0–100). */
  atRiskTabsFilteredPercent?: number;
  /** Filter actions recorded this IDE window. */
  filterEventCount?: number;
};
