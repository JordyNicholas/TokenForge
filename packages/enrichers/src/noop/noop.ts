import type { LlmEnricher } from "../types";

/** Default enricher — no network; returns no LLM findings. */
export const noopEnricher: LlmEnricher = {
  id: "noop",
  async enrich(input) {
    return {
      findings: [],
      meta: {
        backend: "noop",
        model: input.model,
        endpoint: input.endpoint,
        durationMs: 0,
        candidatesSent: input.candidates.length,
      },
    };
  },
};
