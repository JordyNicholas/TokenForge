import type { FiletypeRiskClass } from "./types";

/** Hackathon estimate: `estTokens ≈ ceil(bytes / 4)`. */
export const BYTES_PER_TOKEN = 4;

/** Focused-tab rule: inactive ≥ 10 minutes. */
export const INACTIVE_MS = 10 * 60 * 1000;

/**
 * Non-focused (background) tab rule: inactive ≥ 5 minutes.
 * Shorter than {@link INACTIVE_MS} so idle background context flags sooner.
 */
export const BACKGROUND_INACTIVE_MS = 5 * 60 * 1000;

/** Paths at or above this size are `oversized`. */
export const OVERSIZED_BYTES = 100_000;

export const HIGH_RISK_FILE_CLASSES: ReadonlySet<FiletypeRiskClass> = new Set([
  "lockfile",
  "generated",
]);

/** Contribution of filetype class to `scoreRisk` (0–1). */
export const CLASS_WEIGHT: Record<FiletypeRiskClass, number> = {
  lockfile: 1,
  generated: 0.9,
  config: 0.5,
  unknown: 0.3,
  source: 0.15,
};

export const SCORE_WEIGHT_CLASS = 0.45;
export const SCORE_WEIGHT_SIZE = 0.35;
export const SCORE_WEIGHT_INACTIVE = 0.2;

/** Canonical Token Risk report schema `$id` (current: v1). */
export const TOKEN_RISK_REPORT_SCHEMA_ID =
  "https://tokenforge.dev/schema/risk-event/v1";

/** Repo-relative JSON Schema path. Single source of truth for all surfaces. */
export const TOKEN_RISK_REPORT_SCHEMA_PATH =
  "docs/schemas/risk-event.schema.json";

/**
 * Frozen predecessor contract. v1 is a strict superset (it only adds the
 * `duplicate_logic` reason), so every v0 report still validates against v1 —
 * the reverse is not true. Kept for external consumers pinned to v0.
 */
export const TOKEN_RISK_REPORT_SCHEMA_V0_ID =
  "https://tokenforge.dev/schema/risk-event/v0";

export const TOKEN_RISK_REPORT_SCHEMA_V0_PATH =
  "docs/schemas/risk-event.v0.schema.json";

/** Default largest-file bucket size for LLM enrichment candidates. */
export const DEFAULT_TOP_CANDIDATE_COUNT = 10;

/**
 * Guaranteed minimum count of `source`-class files sampled into LLM
 * candidates by size within their own class, so they don't have to
 * out-compete every other file class in the global top-files ranking.
 * See docs/HEURISTICS_AUDIT.md B8.
 */
export const DEFAULT_SOURCE_CANDIDATE_COUNT = 5;

/** Borderline config/unknown paths at or above this size are LLM candidates. */
export const MIN_BORDERLINE_BYTES = 4_096;

/** Basenames treated as agent instruction / rules files for enrichment. */
export const INSTRUCTION_FILE_NAMES: ReadonlySet<string> = new Set([
  "agents.md",
  "claude.md",
  "copilot-instructions.md",
  "cursorrules",
  ".cursorrules",
]);

/** Path segments that indicate instruction / rules directories. */
export const INSTRUCTION_PATH_SEGMENTS: ReadonlySet<string> = new Set([
  ".cursor",
  "rules",
]);

/** Allowed advisory suggestion kinds (JSON contract). No snippets in v0. */
export const SUGGESTION_KINDS = [
  "exclude_from_context",
  "trim_instructions",
  "dedupe_rules",
  "add_ignore",
  "review",
] as const;

/** Max characters for `scan.llm.analysisOverview.summary`. */
export const MAX_ANALYSIS_OVERVIEW_SUMMARY_CHARS = 800;

/** Max characters per theme tag. */
export const MAX_ANALYSIS_OVERVIEW_THEME_CHARS = 48;

/** Max theme tags on an analysis overview. */
export const MAX_ANALYSIS_OVERVIEW_THEMES = 6;

/** Max characters per caveat string. */
export const MAX_ANALYSIS_OVERVIEW_CAVEAT_CHARS = 160;

/** Max caveat strings on an analysis overview. */
export const MAX_ANALYSIS_OVERVIEW_CAVEATS = 4;

/**
 * Hard cap for synthesized provider instruction files so the policy pack
 * cannot become another fat always-on context file.
 */
export const MAX_LEAN_INSTRUCTION_BYTES = 2_048;
