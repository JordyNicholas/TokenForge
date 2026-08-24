/** Compare billing period keys (`YYYY-MM`). */
export function compareUsagePeriodKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export type NormalizedUsagePeriodPair = {
  baselinePeriod: string | null;
  afterPeriod: string | null;
  /** True when the caller's baseline/after were swapped to chronological order. */
  inverted: boolean;
};

/**
 * Baseline must be the earlier billing month; after the later one.
 * When inverted, swap so compare math matches FinOps intent (pre-Fix → post-Fix).
 */
export function normalizeUsagePeriodPair(
  baselinePeriod: string | null,
  afterPeriod: string | null,
): NormalizedUsagePeriodPair {
  if (!baselinePeriod || !afterPeriod || baselinePeriod === afterPeriod) {
    return { baselinePeriod, afterPeriod, inverted: false };
  }
  if (compareUsagePeriodKeys(baselinePeriod, afterPeriod) > 0) {
    return {
      baselinePeriod: afterPeriod,
      afterPeriod: baselinePeriod,
      inverted: true,
    };
  }
  return { baselinePeriod, afterPeriod, inverted: false };
}
