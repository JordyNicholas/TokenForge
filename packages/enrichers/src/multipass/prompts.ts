import {
  classifyFiletype,
  INSTRUCTION_FILE_NAMES,
  INSTRUCTION_PATH_SEGMENTS,
} from "@tokenforge/risk-core";
import { MAX_MAP_DIGEST_CHARS } from "../limits";
import { buildEnrichmentPrompt, ENRICHMENT_POLICY_RULES } from "../structured";
import type { EnrichmentCandidate, LlmStructuredFinding } from "../types";
import type { RepoContextMap } from "./types";

function basename(path: string): string {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

/** Same rules as risk-core candidate selection — kept local to avoid exporting internals. */
export function isInstructionPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const name = basename(normalized).toLowerCase();
  if (INSTRUCTION_FILE_NAMES.has(name)) {
    return true;
  }
  const segments = normalized.split("/").filter(Boolean);
  return segments.some((segment) =>
    INSTRUCTION_PATH_SEGMENTS.has(segment.toLowerCase()),
  );
}

function truncateDigest(text: string): string {
  const trimmed = text.trim().length > 0 ? text.trim() : "(empty)";
  if (trimmed.length <= MAX_MAP_DIGEST_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_MAP_DIGEST_CHARS)}\n…(truncated)`;
}

/** Compact map block prepended to Pass B / Pass C prompts. */
export function formatRepoContextMap(map: RepoContextMap): string {
  const lines = [
    "RepoContextMap (from Pass A — use for redundancy / hubs only):",
    `hubs: ${JSON.stringify(map.hubs)}`,
    `clusters: ${JSON.stringify(map.clusters)}`,
    `batchHints: ${JSON.stringify(map.batchHints)}`,
  ];
  if (map.suspects && map.suspects.length > 0) {
    lines.push(`suspects: ${JSON.stringify(map.suspects)}`);
  }
  return lines.join("\n");
}

/**
 * Paths worth a content digest in the Pass A map prompt.
 * Instruction files (to spot duplicated guidance) plus source files (to spot
 * duplicated logic) — without a digest the model sees only a path and a byte
 * count, which is not enough to cluster anything by meaning.
 */
function deservesMapDigest(path: string): boolean {
  return isInstructionPath(path) || classifyFiletype(path) === "source";
}

function buildMapInventoryBlock(
  candidates: readonly EnrichmentCandidate[],
): string {
  return candidates
    .map((candidate) => {
      const row = [
        `- ${candidate.path}`,
        `  bytes: ${candidate.bytes}`,
        `  estTokens: ${candidate.estTokens}`,
      ];
      if (deservesMapDigest(candidate.path)) {
        row.push("  digest:");
        row.push("  ```");
        row.push(
          `  ${truncateDigest(candidate.excerpt).replaceAll("\n", "\n  ")}`,
        );
        row.push("  ```");
      }
      return row.join("\n");
    })
    .join("\n");
}

/** Few-shot object using real inventory paths so models copy the exact shape. */
export function buildMapSchemaExample(
  candidates: readonly EnrichmentCandidate[],
): string {
  const paths = candidates.map((candidate) => candidate.path);
  const instructionPaths = paths.filter((path) => isInstructionPath(path));
  const wastePaths = paths.filter(
    (path) =>
      /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|composer\.lock|Cargo\.lock|poetry\.lock|Gemfile\.lock)$/i.test(
        path,
      ) ||
      /(^|\/)(dist|build|generated|vendor|node_modules)\//i.test(path),
  );

  const hub = instructionPaths[0] ?? paths[0] ?? "AGENTS.md";
  const partner =
    instructionPaths.find((path) => path !== hub) ??
    paths.find((path) => path !== hub);
  const hubs = [hub];
  const pair = partner ? [hub, partner] : [hub, hub];
  const clusters = partner ? [pair] : [];
  const batchHints = partner ? [pair] : [];
  const suspects = wastePaths.slice(0, 2);

  return JSON.stringify({ hubs, clusters, batchHints, suspects });
}

const MAP_SCHEMA_RULES: readonly string[] = [
  "Return JSON only — no markdown fences, no commentary.",
  "Always include all four keys: hubs, clusters, batchHints, suspects (use [] when empty).",
  "Copy paths verbatim from the inventory — never invent, rewrite, or shorten paths.",
  "hubs = always-on agent instruction / rules centers (include RULEBOOK-style standards docs if present).",
  "clusters = groups of 2+ inventory paths that likely overlap or duplicate guidance.",
  "batchHints = groups of 2+ inventory paths that must be compared together in a later pass.",
  "suspects = only clear waste candidates (lockfiles, generated/vendored code, dumps) — never README, RULEBOOK, ADRs/DECISIONS, ENVIRONMENTS, OpenAPI/API contracts, or similar docs.",
  "If the inventory includes any instruction/rules path, hubs MUST be non-empty and batchHints SHOULD group related instruction files when 2+ exist.",
  "Prefer small arrays. Empty arrays are allowed only when genuinely nothing fits that key.",
];

/**
 * Pass A — build a structured map of context hubs and duplicate clusters.
 * Digests are included only for instruction / rules paths.
 */
export function buildMapPrompt(candidates: readonly EnrichmentCandidate[]): string {
  const example = buildMapSchemaExample(candidates);

  return [
    "You build a compact context map for TokenForge (AI coding FinOps).",
    "Goal: identify always-on instruction hubs and likely duplicate clusters.",
    "Do not judge exclude/keep yet. Do not suggest architecture or product refactors.",
    "Remember: later passes must cut token bleed without stripping needed documentation.",
    "",
    "Return JSON only with this exact shape (all four keys required):",
    '{"hubs":["path"],"clusters":[["path","path"]],"batchHints":[["path","path"]],"suspects":["path"]}',
    "",
    "Example using paths from THIS inventory (replace values with your judgment; keep keys/types identical):",
    example,
    "",
    "Rules:",
    ...MAP_SCHEMA_RULES.map((rule) => `- ${rule}`),
    "",
    "Candidate inventory:",
    buildMapInventoryBlock(candidates),
  ].join("\n");
}

/**
 * Pass A repair — ask the model to fix a rejected map using validation feedback.
 */
export function buildMapRepairPrompt(
  candidates: readonly EnrichmentCandidate[],
  previousOutput: string,
  validationDetail: string,
): string {
  const clipped =
    previousOutput.length > 4_000
      ? `${previousOutput.slice(0, 4_000)}\n…(truncated)`
      : previousOutput;

  return [
    "Repair your previous RepoContextMap for TokenForge.",
    "Your last JSON failed validation and cannot be used.",
    "",
    `Validation error: ${validationDetail}`,
    "",
    "Return corrected JSON only with this exact shape (all four keys required):",
    '{"hubs":["path"],"clusters":[["path","path"]],"batchHints":[["path","path"]],"suspects":["path"]}',
    "",
    "Example using paths from THIS inventory:",
    buildMapSchemaExample(candidates),
    "",
    "Rules:",
    ...MAP_SCHEMA_RULES.map((rule) => `- ${rule}`),
    "",
    "Previous output:",
    clipped,
    "",
    "Candidate inventory:",
    buildMapInventoryBlock(candidates),
  ].join("\n");
}

/**
 * Pass B — per-batch judge prompt. Prepends the map artifact when present.
 */
export function buildJudgePrompt(
  batch: readonly EnrichmentCandidate[],
  map?: RepoContextMap | null,
): string {
  const base = buildEnrichmentPrompt(batch);
  if (!map) {
    return base;
  }
  return `${formatRepoContextMap(map)}\n\n${base}`;
}

/**
 * Pass C — reconcile findings against the map without re-sending file bodies.
 */
export function buildReconcilePrompt(
  map: RepoContextMap,
  findings: readonly LlmStructuredFinding[],
): string {
  const findingRows = findings.map((finding) =>
    JSON.stringify({
      path: finding.path,
      verdict: finding.verdict,
      reason: finding.reason,
      confidence: finding.confidence,
      detail: finding.detail,
      suggestion: finding.suggestion,
    }),
  );

  return [
    "You reconcile TokenForge LLM findings for consistency.",
    "Do not invent new paths. Do not suggest architecture or product refactors.",
    "You may adjust verdict/reason/detail/suggestion only when justified by the map.",
    "",
    "Return JSON only with this shape:",
    '{"findings":[{"path":"<exact path>","verdict":"exclude|review|keep","reason":"semantic_bloat|redundant_instructions|low_signal_config","confidence":0.0,"detail":"short reason","suggestion":{"kind":"exclude_from_context|trim_instructions|dedupe_rules|add_ignore|review","summary":"one or two sentences"}}],"analysisOverview":{"summary":"3 to 6 sentences on what the enricher concluded","themes":["short theme"],"caveats":["optional caveat"]}}',
    "",
    "Rules:",
    ...ENRICHMENT_POLICY_RULES.map((rule) => `- ${rule}`),
    "- Prefer redundant_instructions only when both related paths appear in hubs/clusters/batchHints or in the findings list.",
    "- Drop findings that exclude documentation/standards/API contracts; convert those to keep (omit) or review + trim_instructions.",
    "- Drop or soften contradictory claims that the map does not support.",
    "- verdict keep = omit from findings unless you must note it.",
    "- suggestion is copy-only advice. TokenForge will not apply it.",
    "- analysisOverview.summary is required: a short capsule (3–6 sentences) of the analysis — themes of waste, what was kept as needed docs, and cross-file redundancy. Do not invent paths.",
    "- analysisOverview.themes: up to 6 short tags. analysisOverview.caveats: up to 4 short quality notes (or []).",
    "",
    formatRepoContextMap(map),
    "",
    "Findings:",
    findingRows.length > 0 ? findingRows.join("\n") : "(none)",
  ].join("\n");
}
