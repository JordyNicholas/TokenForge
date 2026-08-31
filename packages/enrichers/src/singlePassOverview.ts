import {
  parseLlmAnalysisOverview,
  type LlmAnalysisOverview,
} from "@tokenforge/risk-core";
import { buildFallbackAnalysisOverview } from "./multipass/run";

export function analysisOverviewFromPayload(
  payload: unknown,
): LlmAnalysisOverview | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  return parseLlmAnalysisOverview(
    (payload as { analysisOverview?: unknown }).analysisOverview,
  );
}

/** Mandatory overview for Tier-2 single-pass backends — model or deterministic fallback. */
export function resolveSinglePassAnalysisOverview(input: {
  payloads: readonly unknown[];
  findingCount: number;
  candidateCount: number;
}): LlmAnalysisOverview {
  for (let index = input.payloads.length - 1; index >= 0; index -= 1) {
    const parsed = analysisOverviewFromPayload(input.payloads[index]);
    if (parsed) {
      return parsed;
    }
  }
  return buildFallbackAnalysisOverview({
    mapAvailable: false,
    findingCount: input.findingCount,
    candidateCount: input.candidateCount,
  });
}
