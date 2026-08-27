import type { TokenRiskFinding } from "@tokenforge/risk-core";
import { UsageError } from "./errors";
import type {
  EnrichmentCandidate,
  LlmStructuredFinding,
  LlmVerdict,
} from "./types";

const VERDICTS = new Set<LlmVerdict>(["exclude", "review", "keep"]);

export function parseLlmSpec(value: string | undefined): {
  backend: "noop" | "ollama" | "codex" | "anthropic" | "claude-code" | "gemini-cli" | "cursor-cli";
  model: string;
} {
  if (value === undefined || value.trim().length === 0) {
    return { backend: "noop", model: "none" };
  }

  const trimmed = value.trim();
  // CLI-driven backends default to whatever model that CLI is configured with.
  if (trimmed === "codex") {
    return { backend: "codex", model: "default" };
  }
  if (trimmed === "claude-code") {
    return { backend: "claude-code", model: "default" };
  }
  if (trimmed === "gemini-cli") {
    return { backend: "gemini-cli", model: "default" };
  }
  if (trimmed === "cursor-cli") {
    return { backend: "cursor-cli", model: "default" };
  }

  const separator = trimmed.indexOf(":");
  if (separator <= 0 || separator === trimmed.length - 1) {
    // "claude" is the likely typo now that a hyphenated backend id exists, and
    // it reaches here rather than the allowlist below because it has no colon.
    const hint = /^claude([-_]?code)?$/i.test(trimmed)
      ? ' Did you mean "claude-code"?'
      : "";
    throw new UsageError(
      'Invalid --llm value. Use "<backend>:<model>", e.g. ollama:qwen2.5-coder:7b, ' +
        `or a bare CLI backend: codex, claude-code, gemini-cli, cursor-cli.${hint}`,
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
    backend !== "anthropic" &&
    backend !== "claude-code" &&
    backend !== "gemini-cli" &&
    backend !== "cursor-cli"
  ) {
    throw new UsageError(
      `Unknown LLM backend "${backend}". Use noop, ollama, codex, anthropic, claude-code, gemini-cli, or cursor-cli.`,
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
