/**
 * Session adoption from Context Guard Filter decisions (#174).
 * Measures TokenForge usage — not vendor agent internals.
 */

export type SessionAdoptionSnapshot = {
  atRiskTabCount: number;
  filteredTabCount: number;
  /** Integer 0–100 when at-risk tabs exist; null when none. */
  filteredPercent: number | null;
};

export function sessionAdoptionFromCounts(input: {
  filteredCount: number;
  keptCount: number;
  pendingCount: number;
}): SessionAdoptionSnapshot {
  const atRiskTabCount = input.filteredCount + input.keptCount + input.pendingCount;
  const filteredPercent =
    atRiskTabCount > 0
      ? Math.round((input.filteredCount / atRiskTabCount) * 100)
      : null;

  return {
    atRiskTabCount,
    filteredTabCount: input.filteredCount,
    filteredPercent,
  };
}
