import type { TokenRiskTotals } from "@tokenforge/risk-core";

/** True when the active board has measurable before/saved tokens (not an all-zero LLM board). */
export function boardHasSavings(totals: TokenRiskTotals | null | undefined): boolean {
  if (!totals) {
    return false;
  }
  return totals.beforeTokens > 0 || totals.savedTokens > 0;
}
