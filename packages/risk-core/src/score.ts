import { classifyFiletype } from "./classify";
import {
  CLASS_WEIGHT,
  HIGH_RISK_FILE_CLASSES,
  INACTIVE_MS,
  OVERSIZED_BYTES,
  SCORE_WEIGHT_CLASS,
  SCORE_WEIGHT_INACTIVE,
  SCORE_WEIGHT_SIZE,
} from "./constants";
import { estimateTokens } from "./estimate";
import type { FindingReason, RiskAssessment, RiskInput } from "./types";

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

/** Pick the JSON-contract `reason` when a path has more than one. */
export function primaryReason(
  reasons: readonly FindingReason[],
): FindingReason | undefined {
  return REASON_PRIORITY.find((reason) => reasons.includes(reason));
}

/**
 * Score a path for Detect (tabs) and Fix (repo scan).
 * `atRisk` when inactive ≥ 15 min, high-risk filetype, or oversized.
 * Score is a 0–100 mix of class, size, and inactivity (not a vendor signal).
 */
export function scoreRisk(input: RiskInput): RiskAssessment {
  const bytes = normalizeBytes(input.bytes);
  const inactiveMs = normalizeMs(input.inactiveMs);
  const fileClass = classifyFiletype(input.path);
  const reasons: FindingReason[] = [];

  if (HIGH_RISK_FILE_CLASSES.has(fileClass)) {
    reasons.push("high_risk_filetype");
  }
  if (bytes >= OVERSIZED_BYTES) {
    reasons.push("oversized");
  }
  if (inactiveMs >= INACTIVE_MS) {
    reasons.push("inactive_tab");
  }

  const sizeWeight = clamp01(bytes / OVERSIZED_BYTES);
  const inactivityWeight = clamp01(inactiveMs / INACTIVE_MS);
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
  };
}
