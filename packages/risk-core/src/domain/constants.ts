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

/**
 * Higher `oversized` bar for `source` — hand-maintained modules can legitimately
 * exceed {@link OVERSIZED_BYTES} without being low-value context
 * (`HEURISTICS_AUDIT.md` B2 / B3).
 */
export const SOURCE_OVERSIZED_BYTES = 250_000;

/**
 * Lower `oversized` bar for auxiliary data trees (fixtures, mocks, recorded
 * payloads). One flat threshold treats a 30 KB blob of recorded JSON like a
 * 30 KB hand-written module — see `docs/design/HEURISTICS_AUDIT.md` B3. This is the
 * narrow, class-aware version of that recommendation: the reason stays
 * `oversized`, only the bar moves.
 */
export const AUXILIARY_OVERSIZED_BYTES = 25_000;

/**
 * Classes that flag on shape alone, with no size bar to clear.
 *
 * `media` belongs here for the same reason `lockfile` does, not because assets
 * are large: a 1 KB tracking pixel and a 2 MB hero render are equally unreadable
 * to an agent. Judging them by {@link OVERSIZED_BYTES} is what let 260 flag SVGs,
 * 148 avatar JPEGs, and 44 doc images through a real `tabler` scan — every one of
 * them under the bar, so 314 of 315 findings came back `oversized` and whole asset
 * trees produced nothing. See `HEURISTICS_AUDIT.md` B3.
 */
export const HIGH_RISK_FILE_CLASSES: ReadonlySet<FiletypeRiskClass> = new Set([
  "lockfile",
  "generated",
  "test_output",
  "ci_log",
  "build_artifact",
  "media",
]);

/** Contribution of filetype class to `scoreRisk` (0–1). */
export const CLASS_WEIGHT: Record<FiletypeRiskClass, number> = {
  lockfile: 1,
  generated: 0.9,
  test_output: 0.88,
  ci_log: 0.85,
  build_artifact: 0.9,
  media: 0.9,
  config: 0.5,
  unknown: 0.3,
  source: 0.15,
};

export const SCORE_WEIGHT_CLASS = 0.45;
export const SCORE_WEIGHT_SIZE = 0.35;
export const SCORE_WEIGHT_INACTIVE = 0.2;

/** Canonical Token Risk report schema `$id` (current: v5). */
export const TOKEN_RISK_REPORT_SCHEMA_ID =
  "https://tokenforge.dev/schema/risk-event/v5";

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

/** Frozen v2 (`consolidate_duplicates` suggestion kind; seven reasons). */
export const TOKEN_RISK_REPORT_SCHEMA_V2_ID =
  "https://tokenforge.dev/schema/risk-event/v2";

export const TOKEN_RISK_REPORT_SCHEMA_V2_PATH =
  "docs/schemas/risk-event.v2.schema.json";

/** Frozen v3 (`redundant_config` reason; no `activePaths`). */
export const TOKEN_RISK_REPORT_SCHEMA_V3_ID =
  "https://tokenforge.dev/schema/risk-event/v3";

export const TOKEN_RISK_REPORT_SCHEMA_V3_PATH =
  "docs/schemas/risk-event.v3.schema.json";

/** Frozen v4 (`activePaths`; four LLM backends, no `claude-code`). */
export const TOKEN_RISK_REPORT_SCHEMA_V4_ID =
  "https://tokenforge.dev/schema/risk-event/v4";

export const TOKEN_RISK_REPORT_SCHEMA_V4_PATH =
  "docs/schemas/risk-event.v4.schema.json";

/**
 * Global ceiling on paths handed to an LLM enricher in one scan.
 *
 * Owned here rather than in `enrichers` because `selectEnrichmentCandidates`
 * is what enforces it, and the dependency direction is `enrichers → risk-core`.
 * It bounds three unrelated things at once, which is why it is a contract and
 * not a tuning knob: how much source leaves the machine on an external backend,
 * how much a hosted backend is billed for, and — on the local Ollama path,
 * where each batch of 2 has its own 900s timeout — whether a scan of a large
 * monorepo terminates at all.
 */
export const DEFAULT_MAX_ENRICHMENT_CANDIDATES = 30;

/** Default largest-file bucket size for LLM enrichment candidates. */
export const DEFAULT_TOP_CANDIDATE_COUNT = 10;

/**
 * Guaranteed minimum count of `source`-class files sampled into LLM
 * candidates by size within their own class, so they don't have to
 * out-compete every other file class in the global top-files ranking.
 * See docs/design/HEURISTICS_AUDIT.md B8.
 */
export const DEFAULT_SOURCE_CANDIDATE_COUNT = 5;

/** Borderline config/unknown paths at or above this size are LLM candidates. */
export const MIN_BORDERLINE_BYTES = 4_096;

/**
 * Max paths from the borderline enrichment bucket (largest bytes first).
 * Prevents mid-size configs from crowding instruction and top-file slots (#166).
 */
export const DEFAULT_BORDERLINE_CANDIDATE_COUNT = 8;

/**
 * Max paths from the repeated-per-package-config bucket. Capped like every
 * other bucket (see B4): `package.json` recurs in every package of a large
 * monorepo, which would otherwise consume the whole candidate budget.
 */
export const DEFAULT_REPEATED_CONFIG_COUNT = 8;

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

/**
 * Files a directory needs before the asset fold speaks for it instead of its
 * members. A fold trades per-file detail for one line, so it has to be
 * covering enough files to be worth it.
 */
export const MIN_DENSITY_FILES = 8;

/**
 * Share of a directory's direct children that must be `media` before it folds.
 * Only `media` counts, so a folded directory can always report
 * `high_risk_filetype` truthfully — see `policy/density.ts`.
 */
export const DENSITY_MIN_MEDIA_RATIO = 0.9;

/**
 * Directories whose contents are auxiliary bulk data (test fixtures, mocks,
 * recorded payloads). Individually small, collectively expensive.
 *
 * The name list is the limitation the asset fold removes for media: this rule
 * only fires on directories someone thought to enumerate, which is why
 * `assets`, `static`, and `img` never benefited from it (`HEURISTICS_AUDIT.md`
 * B14 / B17).
 */
export const AUXILIARY_DATA_DIR_NAMES: ReadonlySet<string> = new Set([
  "fixtures",
  "__fixtures__",
  "mocks",
  "__mocks__",
  "test-data",
  "testdata",
  "snapshots",
  "__snapshots__",
]);

/**
 * Directories whose contents are test / CI output (coverage, junit, e2e
 * reports). RTK-style output-shape classes — see #171 / HEURISTICS_AUDIT B16.
 */
export const TEST_OUTPUT_DIR_NAMES: ReadonlySet<string> = new Set([
  "coverage",
  "test-results",
  "test-output",
  "playwright-report",
  "playwright",
  "junit",
  ".nyc_output",
  "allure-results",
  "cypress",
]);

/**
 * Build output and binary artifact directories (distinct from codegen trees).
 */
export const BUILD_ARTIFACT_DIR_NAMES: ReadonlySet<string> = new Set([
  "dist",
  "build",
  "out",
  "target",
  ".next",
  "artifacts",
  ".turbo",
  ".parcel-cache",
]);

/** Remaining generated / vendor trees after output-shape split (#171). */
export const GENERATED_TREE_DIR_NAMES: ReadonlySet<string> = new Set([
  "node_modules",
  "generated",
  ".generated",
]);

/**
 * Binary / archive extensions treated as build artifacts by shape.
 * Archives live here rather than with {@link MEDIA_EXTENSIONS}: a `.zip` checked
 * into a repo is packaged output, not something anyone renders.
 */
export const BUILD_ARTIFACT_EXTENSIONS: ReadonlySet<string> = new Set([
  ".jar",
  ".war",
  ".whl",
  ".apk",
  ".aab",
  ".tgz",
  ".wasm",
  ".zip",
  ".tar",
  ".7z",
  ".rar",
]);

/**
 * Rendered assets: images, fonts, audio/video, and design binaries.
 *
 * `.svg` is here deliberately. It is XML, so a size-and-extension reading calls
 * it text — but an icon set is an asset an agent should never read, and icon
 * sets are the bulk of what this class exists to catch. A hand-authored inline
 * SVG *component* lives under source as `.tsx`/`.jsx`, not as a bare `.svg`.
 */
export const MEDIA_EXTENSIONS: ReadonlySet<string> = new Set([
  // images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".bmp",
  ".tif",
  ".tiff",
  ".ico",
  ".icns",
  ".svg",
  // fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  // audio / video
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  // rendered / design binaries
  ".pdf",
  ".psd",
  ".ai",
  ".sketch",
  ".fig",
  ".xcf",
]);

/** Basenames for CI / pipeline log files (extension must be `.log`). */
export const CI_LOG_BASENAMES: ReadonlySet<string> = new Set([
  "ci.log",
  "build.log",
  "pipeline.log",
  "actions.log",
  "github-actions.log",
]);

/** Parent directory segments where any `.log` file is treated as CI output. */
export const CI_LOG_DIR_NAMES: ReadonlySet<string> = new Set([
  "logs",
  "log",
  "ci",
  ".circleci",
]);

/**
 * Credential-shaped paths. These must never become LLM enrichment candidates:
 * hybrid mode sends candidate excerpts to a backend that may be external, and
 * asking a remote model whether a file holds a secret leaks it either way.
 * Path shape only — content-based checks live at the CLI read boundary, since
 * risk-core never touches the filesystem.
 */
export const SECRET_FILE_PATTERNS: readonly RegExp[] = [
  /^\.env(\..+)?$/i,
  /(^|[-_.])credentials?([-_.].*)?\.(json|ya?ml|txt)$/i,
  /(^|[-_.])secrets?([-_.].*)?\.(json|ya?ml|txt)$/i,
  /service-account.*\.json$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)$/i,
  /\.(pem|pfx|p12|key|keystore|jks)$/i,
  /^\.npmrc$/i,
  /^\.pypirc$/i,
];

/** Basenames treated as agent instruction / rules files for enrichment. */
export const INSTRUCTION_FILE_NAMES: ReadonlySet<string> = new Set([
  "agents.md",
  "claude.md",
  "gemini.md",
  "copilot-instructions.md",
  "cursorrules",
  ".cursorrules",
]);

/** Path segments that indicate instruction / rules directories. */
export const INSTRUCTION_PATH_SEGMENTS: ReadonlySet<string> = new Set([
  ".cursor",
  ".gemini",
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
 * Default byte budget for heuristic (deterministic) policy synthesis.
 */
export const DEFAULT_HEURISTIC_POLICY_MAX_BYTES = 4_096;

/**
 * Default byte budget for hybrid (LLM-compiled) policy synthesis.
 */
export const DEFAULT_HYBRID_POLICY_MAX_BYTES = 8_192;

/**
 * Legacy default cap for synthesized provider instruction files.
 * Prefer {@link DEFAULT_HEURISTIC_POLICY_MAX_BYTES} or mode-specific budgets.
 */
export const MAX_LEAN_INSTRUCTION_BYTES = DEFAULT_HEURISTIC_POLICY_MAX_BYTES;

/**
 * Longest a generated reasoning rule may be.
 *
 * A rule is a directive, not an essay: past this the agent is reading prose
 * instead of following an instruction, and the reasoning section has its own
 * small sub-budget to live inside.
 */
export const MAX_ROLE_RULE_CHARS = 200;

/** Representative files kept per directory role, for the hybrid prompt. */
export const MAX_ROLE_SAMPLE_FILES = 3;

/**
 * Byte ceiling for the whole reasoning section, heading included.
 *
 * REASONING_PACK_DESIGN sized the table at ~600 bytes before any rule text
 * existed. Measured against real rows, 600 rendered three paths and no persona,
 * and the first thing it dropped was the shared-component guidance that is one
 * of the two examples the design leads with. 1100 covers a persona plus seven
 * or so rows, which reaches a normal repo.
 *
 * It stays a hard cap rather than a share of the document because this text is
 * added to a file the agent reads every turn and F26 makes no savings claim to
 * pay for it. Under document-wide pressure the whole section yields before the
 * exclusion bullets that do carry the savings.
 */
export const MAX_REASONING_SECTION_BYTES = 1_100;

/** Persona lines the section may render before it stops being a summary. */
export const MAX_REASONING_PERSONA_LINES = 3;

/** Role-bearing directories a repo needs before routing advice means anything. */
export const MIN_REASONING_ROLE_DIRS = 5;

/** Distinct roles a repo needs before a routing table beats saying nothing. */
export const MIN_REASONING_DISTINCT_ROLES = 3;

/**
 * Markers bounding the section `apply` owns inside a provider instruction file.
 *
 * Defined in the kernel rather than in `policy-adapters` because both the
 * adapter that writes the section and the synthesizer that decides what goes in
 * it need to recognise one, and the synthesizer must not depend on the adapter.
 */
export const TOKENFORGE_SECTION_BEGIN = "<!-- tokenforge:begin -->";
export const TOKENFORGE_SECTION_END = "<!-- tokenforge:end -->";

/**
 * Reasoning table rows allowed per source root.
 *
 * In a monorepo the same role appears in every package, so an uncapped table
 * spends its whole budget describing `apps/web` and never reaches `packages/`.
 * Capping per root makes the section say a little about each package rather
 * than everything about the first one.
 */
export const MAX_REASONING_ROWS_PER_ROOT = 4;
