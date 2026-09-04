/**
 * Auto-pick baseline/after usage periods that bracket Fix apply marker timestamps.
 * Period keys are YYYY-MM (see usagePeriodOrder). Marker ISO timestamps map to YYYY-MM.
 */
import type { ProveChangeMarker } from "@tokenforge/risk-core";
import { compareUsagePeriodKeys } from "./usagePeriodOrder";
import { listUsagePeriods } from "./varianceBoard";
import type { UsageMetrics } from "./usage";

export type PeriodBindResult = {
  baselinePeriod: string | null;
  afterPeriod: string | null;
  /** True when markers + ≥2 snapshots exist but no valid bracket was found. */
  unbound: boolean;
};

function periodFromIso(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso.trim());
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2]}`;
}

/**
 * Prefer the latest apply/org-pack marker month as the boundary:
 * baseline = latest snapshot strictly before marker month (or earliest if none),
 * after = earliest snapshot on/after marker month (or latest if none).
 */
export function bindPeriodsAroundMarkers(
  snapshots: Record<string, UsageMetrics>,
  markers: readonly ProveChangeMarker[],
): PeriodBindResult {
  const periods = listUsagePeriods(snapshots);
  if (periods.length === 0) {
    return { baselinePeriod: null, afterPeriod: null, unbound: false };
  }
  if (periods.length === 1) {
    return {
      baselinePeriod: periods[0] ?? null,
      afterPeriod: null,
      unbound: markers.length > 0,
    };
  }
  if (markers.length === 0) {
    return { baselinePeriod: null, afterPeriod: null, unbound: false };
  }

  const markerMonths = markers
    .map((m) => periodFromIso(m.timestamp))
    .filter((p): p is string => Boolean(p))
    .sort(compareUsagePeriodKeys);
  const boundary = markerMonths[markerMonths.length - 1];
  if (!boundary) {
    return { baselinePeriod: null, afterPeriod: null, unbound: true };
  }

  const before = periods
    .filter((p) => compareUsagePeriodKeys(p, boundary) < 0)
    .sort(compareUsagePeriodKeys);
  const onOrAfter = periods
    .filter((p) => compareUsagePeriodKeys(p, boundary) >= 0)
    .sort(compareUsagePeriodKeys);

  const baselinePeriod = before[before.length - 1] ?? null;
  const afterPeriod = onOrAfter[0] ?? null;

  if (!baselinePeriod || !afterPeriod) {
    return {
      baselinePeriod: baselinePeriod ?? periods[periods.length - 1] ?? null,
      afterPeriod: afterPeriod ?? periods[0] ?? null,
      unbound: true,
    };
  }

  return { baselinePeriod, afterPeriod, unbound: false };
}
