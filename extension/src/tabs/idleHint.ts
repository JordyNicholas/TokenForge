import {
  BACKGROUND_INACTIVE_MS,
  INACTIVE_MS,
} from "@tokenforge/risk-core";
import type { TrackedTab } from "./types";

/** Compact duration for panel copy (`4m`, `1h 2m`, `<1m`). */
export function formatDurationMs(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const totalMinutes = Math.floor(clamped / 60_000);
  if (totalMinutes < 1) {
    return "<1m";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export type IdleHint =
  | { kind: "idle_for"; label: string }
  | { kind: "at_risk_in"; label: string; remainingMs: number }
  | undefined;

/**
 * Panel hint for inactivity: already idle, or countdown until the idle rule fires.
 * Background tabs use the shorter 5m threshold; focused tabs use 10m.
 */
export function idleHintForTab(
  tab: TrackedTab,
  nowMs: number = Date.now(),
  options: { background?: boolean } = {},
): IdleHint {
  const idleMs = Math.max(0, nowMs - tab.lastActivityAt);
  const thresholdMs = options.background ? BACKGROUND_INACTIVE_MS : INACTIVE_MS;

  if (tab.assessment.reasons.includes("inactive_tab")) {
    return { kind: "idle_for", label: `idle ${formatDurationMs(idleMs)}` };
  }

  if (tab.assessment.atRisk) {
    return undefined;
  }

  const remainingMs = thresholdMs - idleMs;
  if (remainingMs <= 0 || remainingMs > thresholdMs) {
    return undefined;
  }

  // Only surface approaching idle when the tab has been idle for at least 1 minute.
  if (idleMs < 60_000) {
    return undefined;
  }

  return {
    kind: "at_risk_in",
    label: `at risk in ${formatDurationMs(remainingMs)}`,
    remainingMs,
  };
}
