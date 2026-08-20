import type { TokenRiskFinding } from "@tokenforge/risk-core";
import { UsageError } from "../app/errors";
import type {
  EnrichmentCandidate,
  LlmStructuredFinding,
  LlmVerdict,
} from "./types";

const VERDICTS = new Set<LlmVerdict>(["exclude", "review", "keep"]);

export function parseLlmSpec(value: string | undefined): {
  backend: "noop" | "ollama" | "codex" | "anthropic";
  model: string;
} {
  if (value === undefined || value.trim().length === 0) {
    return { backend: "noop", model: "none" };
  }

  const trimmed = value.trim();
  if (trimmed === "codex") {
    return { backend: "codex", model: "default" };
  }

  const separator = trimmed.indexOf(":");
  if (separator <= 0 || separator === trimmed.length - 1) {
    throw new UsageError(
      'Invalid --llm value. Use "<backend>:<model>", e.g. ollama:qwen2.5-coder:7b.',
    );
  }

  const backend = trimmed.slice(0, separator).trim();
  const model = trimmed.slice(separator + 1).trim();
  if (model.length === 0) {
    throw new UsageError(
      'Invalid --llm value. Model must not be empty; use "<backend>:<model>".',
    );
  }
  if (
    backend !== "noop" &&
    backend !== "ollama" &&
    backend !== "codex" &&
    backend !== "anthropic"
  ) {
    throw new UsageError(
      `Unknown LLM backend "${backend}". Use noop, ollama, codex, or anthropic.`,
    );
  }

  return { backend, model };
}

export function mapStructuredFinding(
  row: LlmStructuredFinding,
  candidates: readonly EnrichmentCandidate[],
): TokenRiskFinding | undefined {
  if (!VERDICTS.has(row.verdict)) {
    return undefined;
  }

  const candidate = candidates.find((item) => item.path === row.path);
  if (candidate === undefined) {
    return undefined;
  }

  const action =
    row.verdict === "exclude"
      ? "excluded"
      : row.verdict === "keep"
        ? "kept"
        : "kept";

  return {
    path: row.path,
    reason: row.reason,
    bytes: candidate.bytes,
    estTokens: candidate.estTokens,
    action,
    source: "llm",
    confidence: row.confidence,
    detail: row.detail,
    suggestion: row.suggestion,
  };
}

export function mapStructuredFindings(
  rows: readonly LlmStructuredFinding[],
  candidates: readonly EnrichmentCandidate[],
): TokenRiskFinding[] {
  return rows.flatMap((row) => {
    const finding = mapStructuredFinding(row, candidates);
    return finding ? [finding] : [];
  });
}
