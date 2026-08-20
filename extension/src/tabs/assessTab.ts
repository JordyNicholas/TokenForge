import {
  BACKGROUND_INACTIVE_MS,
  INACTIVE_MS,
  type RiskAssessment,
  scoreRisk,
} from "@tokenforge/risk-core";
import type { TabSnapshot } from "./types";

export type AssessTabOptions = {
  /** When true, use the shorter background idle threshold (5m). */
  background?: boolean;
};

export function assessTab(
  snapshot: TabSnapshot,
  nowMs: number = Date.now(),
  options: AssessTabOptions = {},
): RiskAssessment {
  const inactiveMs = Math.max(0, nowMs - snapshot.lastActivityAt);
  const inactiveThresholdMs = options.background
    ? BACKGROUND_INACTIVE_MS
    : INACTIVE_MS;
  return scoreRisk({
    path: snapshot.path,
    bytes: snapshot.bytes,
    inactiveMs,
    inactiveThresholdMs,
  });
}
