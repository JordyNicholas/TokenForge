import type { FindingReason } from "@tokenforge/risk-core";
import type { EnrichmentCandidate, LlmStructuredFinding } from "./types";
import { MAX_LLM_EXCERPT_CHARS } from "./limits";

const LLM_REASONS = new Set<FindingReason>([
  "semantic_bloat",
  "redundant_instructions",
  "low_signal_config",
]);

const VERDICTS = new Set<LlmStructuredFinding["verdict"]>([
  "exclude",
  "review",
  "keep",
]);

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
    '{"findings":[{"path":"<exact path>","verdict":"exclude|review|keep","reason":"semantic_bloat|redundant_instructions|low_signal_config","confidence":0.0,"detail":"short reason"}]}',
    "",
    "Rules:",
    "- Use exact paths from the input.",
    "- verdict exclude = recommend excluding from agent context.",
    "- verdict review = borderline; still include in findings.",
    "- verdict keep = omit from findings unless you must note it.",
    "- Prefer exclude for generated noise, redundant instructions, or low-signal config.",
    "",
    "Files:",
    blocks.join("\n\n"),
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(1, Math.max(0, value));
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

    rows.push({
      path: item.path,
      verdict: item.verdict as LlmStructuredFinding["verdict"],
      reason,
      confidence: clampConfidence(item.confidence),
      detail: typeof item.detail === "string" ? item.detail : undefined,
    });
  }

  return rows;
}
