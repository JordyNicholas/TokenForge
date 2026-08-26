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

/** Canonical Token Risk report schema `$id` (current: v2). */
export const TOKEN_RISK_REPORT_SCHEMA_ID =
  "https://tokenforge.dev/schema/risk-event/v2";

/** Repo-relative JSON Schema path. Single source of truth for all surfaces. */
export const TOKEN_RISK_REPORT_SCHEMA_PATH =
  "docs/schemas/risk-event.schema.json";

/**
 * Frozen predecessor contracts. Each live version is a strict superset of the
 * prior freeze, so older reports still validate against the current schema —
 * the reverse is not true.
 */
export const TOKEN_RISK_REPORT_SCHEMA_V0_ID =
  "https://tokenforge.dev/schema/risk-event/v0";

export const TOKEN_RISK_REPORT_SCHEMA_V0_PATH =
  "docs/schemas/risk-event.v0.schema.json";

/** Frozen v1 (`duplicate_logic` reason; five suggestion kinds). */
export const TOKEN_RISK_REPORT_SCHEMA_V1_ID =
  "https://tokenforge.dev/schema/risk-event/v1";

export const TOKEN_RISK_REPORT_SCHEMA_V1_PATH =
  "docs/schemas/risk-event.v1.schema.json";

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

/**
 * Config basenames an agent needs to reason correctly (build/lint/flags).
 * Small enough to stay under {@link OVERSIZED_BYTES} today, so they are only
 * protected by accident — see `protect/protect.ts`.
 */
export const PROTECTED_CONFIG_NAMES: ReadonlySet<string> = new Set([
  "tsconfig.json",
  "jsconfig.json",
  "package.json",
  ".eslintrc",
  ".eslintrc.json",
  "eslint.config.js",
  "eslint.config.mjs",
  ".prettierrc",
  ".prettierrc.json",
  "vite.config.ts",
  "vitest.config.ts",
  "tsconfig.base.json",
]);

/** Config basenames matched by shape rather than an exact name. */
export const PROTECTED_CONFIG_PATTERNS: readonly RegExp[] = [
  /^tsconfig\..+\.json$/i,
  /^jsconfig\..+\.json$/i,
  /^\.eslintrc\..+$/i,
  /-flags\.json$/i,
  /^feature-flags\..+$/i,
];

/**
 * API/schema contracts an agent reads to avoid inventing endpoints or types.
 * Size correlates with completeness here, so {@link OVERSIZED_BYTES} points the
 * wrong way — the better the contract, the more likely it trips the rule.
 */
export const API_CONTRACT_PATTERNS: readonly RegExp[] = [
  /^openapi(\..+)?\.(json|ya?ml)$/i,
  /^swagger(\..+)?\.(json|ya?ml)$/i,
  /^asyncapi(\..+)?\.(json|ya?ml)$/i,
  /^schema\.graphql$/i,
];

/**
 * Generated trees an agent still needs (typed API clients / schemas), unlike
 * `dist`/`build` output. Matched as `<segment>/<segment>` pairs under a
 * generated root so a hand-written `src/graphql/` is not swept in.
 */
export const NECESSARY_GENERATED_SEGMENTS: ReadonlySet<string> = new Set([
  "graphql",
  "openapi",
  "swagger",
  "api",
]);

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

/**
 * Allowed advisory suggestion kinds (JSON contract). No snippets.
 * `consolidate_duplicates` is vocabulary only — never applied by `apply`.
 */
export const SUGGESTION_KINDS = [
  "exclude_from_context",
  "trim_instructions",
  "dedupe_rules",
  "add_ignore",
  "review",
  "consolidate_duplicates",
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
