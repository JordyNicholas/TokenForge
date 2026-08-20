import {
  INSTRUCTION_FILE_NAMES,
  INSTRUCTION_PATH_SEGMENTS,
} from "@tokenforge/risk-core";
import { MAX_MAP_DIGEST_CHARS } from "../limits";
import { buildEnrichmentPrompt } from "../structured";
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
 * Pass A — build a structured map of context hubs and duplicate clusters.
 * Digests are included only for instruction / rules paths.
 */
export function buildMapPrompt(candidates: readonly EnrichmentCandidate[]): string {
  const inventory = candidates.map((candidate) => {
    const row = [
      `- ${candidate.path}`,
      `  bytes: ${candidate.bytes}`,
      `  estTokens: ${candidate.estTokens}`,
    ];
    if (isInstructionPath(candidate.path)) {
      row.push("  digest:");
      row.push("  ```");
      row.push(`  ${truncateDigest(candidate.excerpt).replaceAll("\n", "\n  ")}`);
      row.push("  ```");
    }
    return row.join("\n");
  });

  return [
    "You build a compact context map for TokenForge (AI coding FinOps).",
    "Goal: identify always-on instruction hubs and likely duplicate clusters.",
    "Do not judge exclude/keep yet. Do not suggest architecture or product refactors.",
    "",
    "Return JSON only with this shape:",
    '{"hubs":["path"],"clusters":[["path","path"]],"batchHints":[["path","path"]],"suspects":["path"]}',
    "",
    "Rules:",
    "- Use exact paths from the inventory only.",
    "- hubs = always-on agent instruction / rules centers.",
    "- clusters = groups that likely overlap or duplicate guidance.",
    "- batchHints = groups that must be compared together in a later pass.",
    "- suspects = optional paths that may be low-value billable context.",
    "- Prefer small arrays. Omit empty optional fields if unused.",
    "",
    "Candidate inventory:",
    inventory.join("\n"),
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
    '{"findings":[{"path":"<exact path>","verdict":"exclude|review|keep","reason":"semantic_bloat|redundant_instructions|low_signal_config","confidence":0.0,"detail":"short reason","suggestion":{"kind":"exclude_from_context|trim_instructions|dedupe_rules|add_ignore|review","summary":"one or two sentences"}}]}',
    "",
    "Rules:",
    "- Prefer redundant_instructions only when both related paths appear in hubs/clusters/batchHints or in the findings list.",
    "- Drop or soften contradictory claims that the map does not support.",
    "- verdict keep = omit from findings unless you must note it.",
    "- suggestion is copy-only advice. TokenForge will not apply it.",
    "",
    formatRepoContextMap(map),
    "",
    "Findings:",
    findingRows.length > 0 ? findingRows.join("\n") : "(none)",
  ].join("\n");
}
