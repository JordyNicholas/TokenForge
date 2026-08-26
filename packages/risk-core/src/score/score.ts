import { classifyFiletype } from "../classify/classify";
import {
  CLASS_WEIGHT,
  HIGH_RISK_FILE_CLASSES,
  INACTIVE_MS,
  OVERSIZED_BYTES,
  SCORE_WEIGHT_CLASS,
  SCORE_WEIGHT_INACTIVE,
  SCORE_WEIGHT_SIZE,
} from "../domain/constants";
import { estimateTokens } from "../estimate/estimate";
import { protectionFor } from "../protect/protect";
import type { FindingReason, RiskAssessment, RiskInput } from "../domain/types";

const REASON_PRIORITY: FindingReason[] = [
  "high_risk_filetype",
  "oversized",
  "inactive_tab",
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizeMs(inactiveMs: number): number {
  return Number.isFinite(inactiveMs) ? Math.max(0, inactiveMs) : 0;
}

function normalizeBytes(bytes: number): number {
  return Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
}

function normalizeThreshold(thresholdMs: number | undefined): number {
  if (thresholdMs === undefined || !Number.isFinite(thresholdMs) || thresholdMs <= 0) {
    return INACTIVE_MS;
  }
  return thresholdMs;
}

/** Pick the JSON-contract `reason` when a path has more than one. */
export function primaryReason(
  reasons: readonly FindingReason[],
): FindingReason | undefined {
  return REASON_PRIORITY.find((reason) => reasons.includes(reason));
}

/**
 * Score a path for Detect (tabs) and Fix (repo scan).
 * `atRisk` when inactive past the threshold (default 10 min focused / 5 min
 * background via `inactiveThresholdMs`), high-risk filetype, or oversized.
 * Score is a 0–100 mix of class, size, and inactivity (not a vendor signal).
 *
 * A protected path (see `protect/protect.ts`) keeps its class and score but
 * drops the reasons that would recommend excluding it, so Fix cannot suggest
 * hiding a build config or an API contract from the agent that needs it.
 */
export function scoreRisk(input: RiskInput): RiskAssessment {
  const bytes = normalizeBytes(input.bytes);
  const inactiveMs = normalizeMs(input.inactiveMs);
  const inactiveThresholdMs = normalizeThreshold(input.inactiveThresholdMs);
  const fileClass = classifyFiletype(input.path);
  const protection = protectionFor(input.path);
  const suppressed = new Set<FindingReason>(protection?.suppresses ?? []);
  const reasons: FindingReason[] = [];

  if (HIGH_RISK_FILE_CLASSES.has(fileClass) && !suppressed.has("high_risk_filetype")) {
    reasons.push("high_risk_filetype");
  }
  if (bytes >= OVERSIZED_BYTES && !suppressed.has("oversized")) {
    reasons.push("oversized");
  }
  if (inactiveMs >= inactiveThresholdMs) {
    reasons.push("inactive_tab");
  }

  const sizeWeight = clamp01(bytes / OVERSIZED_BYTES);
  const inactivityWeight = clamp01(inactiveMs / inactiveThresholdMs);
  const mixed =
    SCORE_WEIGHT_CLASS * CLASS_WEIGHT[fileClass] +
    SCORE_WEIGHT_SIZE * sizeWeight +
    SCORE_WEIGHT_INACTIVE * inactivityWeight;

  return {
    path: input.path,
    bytes,
    estTokens: estimateTokens(bytes),
    fileClass,
    score: Math.round(100 * clamp01(mixed)),
    atRisk: reasons.length > 0,
    reasons,
    ...(protection ? { protection: protection.kind } : {}),
  };
}
