import type { LlmBackendId } from "@tokenforge/risk-core";
import { UsageError } from "../app/errors";
import { noopEnricher } from "./noop/noop";
import type { LlmEnricher } from "./types";

const STUBBED: ReadonlySet<LlmBackendId> = new Set([
  "ollama",
  "openai",
  "anthropic",
]);

/**
 * Resolve an LLM enricher adapter. MVP hybrid mode uses noop until backend
 * issues (#32–#34) land.
 */
export function getEnricher(id: LlmBackendId): LlmEnricher {
  if (id === "noop") {
    return noopEnricher;
  }
  if (STUBBED.has(id)) {
    throw new UsageError(
      `${id} enricher is not implemented yet. Use --mode heuristic or omit --llm for noop hybrid scans. See docs/HYBRID_SCAN_DESIGN.md.`,
    );
  }
  throw new UsageError(`Unknown LLM backend "${id}".`);
}
