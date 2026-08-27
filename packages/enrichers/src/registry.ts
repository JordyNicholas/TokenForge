import type { LlmBackendId } from "@tokenforge/risk-core";
import { UsageError } from "./errors";
import { anthropicEnricher } from "./anthropic/anthropic";
import { claudeCodeEnricher } from "./claude-code/claude-code";
import { codexEnricher } from "./codex/codex";
import { geminiCliEnricher } from "./gemini-cli/gemini-cli";
import { noopEnricher } from "./noop/noop";
import { ollamaEnricher } from "./ollama/ollama";
import type { LlmEnricher } from "./types";

/** Resolve an LLM enricher adapter for hybrid scan. */
export function getEnricher(id: LlmBackendId): LlmEnricher {
  if (id === "noop") {
    return noopEnricher;
  }
  if (id === "ollama") {
    return ollamaEnricher;
  }
  if (id === "anthropic") {
    return anthropicEnricher;
  }
  if (id === "codex") {
    return codexEnricher;
  }
  if (id === "claude-code") {
    return claudeCodeEnricher;
  }
  if (id === "gemini-cli") {
    return geminiCliEnricher;
  }
  throw new UsageError(`Unknown LLM backend "${id}".`);
}
