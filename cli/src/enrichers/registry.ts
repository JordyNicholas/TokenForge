import type { LlmBackendId } from "@tokenforge/risk-core";
import { UsageError } from "../app/errors";
import { anthropicEnricher } from "./anthropic/anthropic";
import { codexEnricher } from "./codex/codex";
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
  throw new UsageError(`Unknown LLM backend "${id}".`);
}
