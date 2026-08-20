import { INACTIVE_MS } from "@tokenforge/risk-core";
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
 * Panel hint for inactivity: already idle, or countdown until the 15m rule fires.
 * High-risk/oversized tabs that are at-risk for other reasons skip the countdown.
 */
export function idleHintForTab(tab: TrackedTab, nowMs: number = Date.now()): IdleHint {
  const idleMs = Math.max(0, nowMs - tab.lastActivityAt);

  if (tab.assessment.reasons.includes("inactive_tab")) {
    return { kind: "idle_for", label: `idle ${formatDurationMs(idleMs)}` };
  }

  if (tab.assessment.atRisk) {
    return undefined;
  }

  const remainingMs = INACTIVE_MS - idleMs;
  if (remainingMs <= 0 || remainingMs > INACTIVE_MS) {
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
