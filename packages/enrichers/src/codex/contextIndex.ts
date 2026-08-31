import { parseContextIndexRecommendations } from "@tokenforge/risk-core";
import type { ContextIndexRecommendation } from "@tokenforge/risk-core";

export function contextIndexRecommendationsFromPayload(
  payload: unknown,
): ContextIndexRecommendation[] {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return [];
  }
  return parseContextIndexRecommendations(
    (payload as { contextIndexRecommendations?: unknown })
      .contextIndexRecommendations,
  );
}
