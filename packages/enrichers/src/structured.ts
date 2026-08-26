import {
  isFindingSuggestion,
  type FindingReason,
  type FindingSuggestion,
} from "@tokenforge/risk-core";
import type { EnrichmentCandidate, LlmStructuredFinding } from "./types";
import { MAX_LLM_EXCERPT_CHARS } from "./limits";

const LLM_REASONS = new Set<FindingReason>([
  "semantic_bloat",
  "redundant_instructions",
  "low_signal_config",
  "duplicate_logic",
]);

const VERDICTS = new Set<LlmStructuredFinding["verdict"]>([
  "exclude",
  "review",
  "keep",
]);

/**
 * Shared Detect policy for local/external enrichers.
 * Token bleed cuts must not strip docs/rules needed for correct agent work.
 */
export const ENRICHMENT_POLICY_RULES: readonly string[] = [
  "Primary goal: reduce billable token bleed while preserving repository functionality and documentation that agents need to work correctly.",
  "exclude ONLY clear waste: lockfiles, generated/vendored code (e.g. Prisma client, dist/build), minified bundles, oversized dumps, or truly duplicate always-on instruction copies.",
  "KEEP (verdict keep / omit from findings) project documentation and standards: README, RULEBOOK, ADRs/DECISIONS, ENVIRONMENTS, architecture guides, OpenAPI/API contracts, CONTRIBUTING, and similar docs — even if large.",
  "For oversized but useful docs/instructions, prefer verdict review with suggestion.kind trim_instructions or dedupe_rules — never exclude the whole file.",
  "When unsure whether a path is waste or needed documentation, choose keep or review — never exclude.",
  "redundant_instructions applies only to overlapping agent instruction/rules files — never to generated code, scripts, or general docs.",
  "duplicate_logic is the source-code counterpart: two or more source paths implementing the same behavior under different names. Name the other path in detail.",
  "duplicate_logic is ALWAYS verdict review, never exclude — both copies are still imported and executed, so hiding one from context fixes nothing. Its suggestion.kind must be consolidate_duplicates (copy-only; TokenForge will not apply a source edit).",
  "low_signal_config is for noisy machine config dumps — not for human-facing docs or API contracts.",
  "Do not exclude a path merely because it is 'not the file being edited' or 'infrastructure-related'.",
];

export function buildEnrichmentPrompt(candidates: readonly EnrichmentCandidate[]): string {
  const blocks = candidates.map((candidate) => {
    const raw =
      candidate.excerpt.trim().length > 0
        ? candidate.excerpt
        : "(empty or unreadable file)";
    const excerpt =
      raw.length > MAX_LLM_EXCERPT_CHARS
        ? `${raw.slice(0, MAX_LLM_EXCERPT_CHARS)}\n…(truncated)`
        : raw;
    return [
      `### ${candidate.path}`,
      `bytes: ${candidate.bytes}`,
      `estTokens: ${candidate.estTokens}`,
      "```",
      excerpt,
      "```",
    ].join("\n");
  });

  return [
    "You analyze repository files for AI coding agent context waste (TokenForge).",
    "For each path, decide whether it is low-value billable context for Chat/Agent workflows.",
    "",
    "Return JSON only with this shape:",
    '{"findings":[{"path":"<exact path>","verdict":"exclude|review|keep","reason":"semantic_bloat|redundant_instructions|low_signal_config|duplicate_logic","confidence":0.0,"detail":"short reason","suggestion":{"kind":"exclude_from_context|trim_instructions|dedupe_rules|add_ignore|review|consolidate_duplicates","summary":"one or two sentences"}}]}',
    "",
    "Rules:",
    "- Use exact paths from the input.",
    "- verdict exclude = recommend excluding from agent context.",
    "- verdict review = borderline; still include in findings.",
    "- verdict keep = omit from findings unless you must note it.",
    ...ENRICHMENT_POLICY_RULES.map((rule) => `- ${rule}`),
    "- suggestion.kind must be one of those six values. Unknown kinds are dropped.",
    "- suggestion.kind consolidate_duplicates is only valid with reason duplicate_logic.",
    "- suggestion.summary is copy-only advice for a developer. TokenForge will not apply it.",
    "- Do not suggest architecture, API, or product refactors beyond consolidate_duplicates for duplicate_logic. Do not include code patches or whole-file rewrites.",
    "",
    "Files:",
    blocks.join("\n\n"),
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Soft ceiling so models cannot claim absolute certainty on Detect findings. */
export const MAX_LLM_CONFIDENCE = 0.95;

function clampConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(MAX_LLM_CONFIDENCE, Math.max(0, value));
}

export function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM response did not contain JSON.");
  }
}

function parseSuggestion(value: unknown): FindingSuggestion | undefined {
  if (!isFindingSuggestion(value)) {
    return undefined;
  }
  return { kind: value.kind, summary: value.summary.trim() };
}

function normalizeSuggestion(
  reason: FindingReason,
  value: unknown,
): FindingSuggestion | undefined {
  const parsed = parseSuggestion(value);
  if (reason !== "duplicate_logic") {
    return parsed;
  }
  // Invariant: duplicate_logic advice is consolidate_duplicates only (#114).
  if (parsed) {
    return { kind: "consolidate_duplicates", summary: parsed.summary };
  }
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { summary?: unknown }).summary === "string"
  ) {
    const summary = (value as { summary: string }).summary.trim();
    if (summary.length > 0) {
      return { kind: "consolidate_duplicates", summary };
    }
  }
  return undefined;
}

export function parseStructuredFindings(
  payload: unknown,
  candidates: readonly EnrichmentCandidate[],
): LlmStructuredFinding[] {
  if (!isRecord(payload) || !Array.isArray(payload.findings)) {
    return [];
  }

  const paths = new Set(candidates.map((candidate) => candidate.path));
  const rows: LlmStructuredFinding[] = [];

  for (const item of payload.findings) {
    if (!isRecord(item)) {
      continue;
    }
    if (typeof item.path !== "string" || !paths.has(item.path)) {
      continue;
    }
    if (typeof item.verdict !== "string" || !VERDICTS.has(item.verdict as LlmStructuredFinding["verdict"])) {
      continue;
    }
    if (item.verdict === "keep") {
      continue;
    }
    const reason =
      typeof item.reason === "string" && LLM_REASONS.has(item.reason as FindingReason)
        ? (item.reason as FindingReason)
        : "semantic_bloat";

    // Invariant, enforced here because every backend funnels through this
    // parser: duplicate_logic is advisory only. Both copies are still
    // imported, so excluding one from context fixes nothing. A model that
    // ignores the prompt rule gets coerced rather than trusted.
    const verdict =
      reason === "duplicate_logic"
        ? "review"
        : (item.verdict as LlmStructuredFinding["verdict"]);

    rows.push({
      path: item.path,
      verdict,
      reason,
      confidence: clampConfidence(item.confidence),
      detail: typeof item.detail === "string" ? item.detail : undefined,
      suggestion: normalizeSuggestion(reason, item.suggestion),
    });
  }

  return rows;
}
