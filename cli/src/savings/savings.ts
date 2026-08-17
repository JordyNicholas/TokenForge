import type { TokenRiskTotals } from "@tokenforge/risk-core";

/** One decimal place: `round(saved/before * 1000) / 10`. */
export const SAVED_PERCENT_DIGITS = 1;

export type TotalsPayload = TokenRiskTotals & {
  savedPercent: number;
};

/**
 * Scenario savings percent for CLI output and the dashboard seed.
 * Not a production SLA — it is ceil(bytes/4) math on the scanned tree.
 */
export function savedPercent(totals: TokenRiskTotals): number {
  if (totals.beforeTokens <= 0) {
    return 0;
  }
  const percent = (totals.savedTokens / totals.beforeTokens) * 100;
  const factor = 10 ** SAVED_PERCENT_DIGITS;
  return Math.round(percent * factor) / factor;
}

export function formatSavedPercent(totals: TokenRiskTotals): string {
  return `${savedPercent(totals).toFixed(SAVED_PERCENT_DIGITS)}%`;
}

export function totalsPayload(totals: TokenRiskTotals): TotalsPayload {
  return {
    beforeTokens: totals.beforeTokens,
    afterTokens: totals.afterTokens,
    savedTokens: totals.savedTokens,
    savedPercent: savedPercent(totals),
  };
}

/**
 * Demo-scripting exit codes after a successful scan/apply/init:
 * - 0: savedTokens > 0
 * - 3: completed, but nothing to prove
 */
export function savingsExitCode(totals: TokenRiskTotals): 0 | 3 {
  return totals.savedTokens > 0 ? 0 : 3;
}
