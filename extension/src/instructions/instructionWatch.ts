import { estimateTokens } from "@tokenforge/risk-core";
import { collectInstructionCandidates } from "../enrich/collectCandidates";
import type { TrackedTab } from "../tabs/types";

/** Live rules budget from instruction-path candidates (heuristic bytes → tokens). */
export async function estimateRulesBudget(
  root: string,
  tabs: readonly TrackedTab[],
): Promise<number> {
  const candidates = await collectInstructionCandidates(root, tabs);
  return candidates.reduce((sum, assessment) => sum + assessment.estTokens, 0);
}

/** Compare rules budget against the configured threshold setting. */
export function isRulesBudgetOverThreshold(
  rulesTokens: number,
  threshold: number = 8_000,
): boolean {
  return rulesTokens >= threshold;
}

/** Rough token estimate from raw instruction bytes (for tests / placeholders). */
export function tokensFromInstructionBytes(bytes: number): number {
  return estimateTokens(bytes);
}
