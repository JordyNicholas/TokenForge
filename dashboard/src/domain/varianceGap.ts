/**
 * Variance vs estimate gap as a signed percent of estimated reduction.
 * Positive gap % = bill fell less than estimated (under-delivered savings).
 */
export function varianceGapPercent(
  varianceUsd: number,
  estimatedUsdReduction: number,
): number | null {
  if (!Number.isFinite(estimatedUsdReduction) || estimatedUsdReduction <= 0) {
    return null;
  }
  return Math.round((varianceUsd / estimatedUsdReduction) * 1000) / 10;
}

/** Format signed gap % for display. */
export function formatGapPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}
