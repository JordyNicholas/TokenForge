import type { LlmBackendId } from "@tokenforge/risk-core";
import { UsageError } from "../app/errors";
import { noopEnricher } from "./noop/noop";
import { ollamaEnricher } from "./ollama/ollama";
import type { LlmEnricher } from "./types";

const STUBBED: ReadonlySet<LlmBackendId> = new Set(["openai", "anthropic"]);

/** Resolve an LLM enricher adapter for hybrid scan. */
export function getEnricher(id: LlmBackendId): LlmEnricher {
  if (id === "noop") {
    return noopEnricher;
  }
  if (id === "ollama") {
    return ollamaEnricher;
  }
  if (STUBBED.has(id)) {
    throw new UsageError(
      `${id} enricher is not implemented yet. Use --mode heuristic, --llm ollama:<model>, or omit --llm for noop hybrid scans.`,
    );
  }
  throw new UsageError(`Unknown LLM backend "${id}".`);
}
