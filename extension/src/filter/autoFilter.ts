import { HIGH_RISK_FILE_CLASSES, type RiskAssessment } from "@tokenforge/risk-core";
import type { RiskSession } from "../session/riskSession";

export function isAutoFilterCandidate(assessment: RiskAssessment): boolean {
  return HIGH_RISK_FILE_CLASSES.has(assessment.fileClass);
}

/**
 * When enabled, pending lockfile/generated tabs become Filtered.
 * Tabs marked Kept are left alone so Restore/Keep remains a durable override.
 */
export function applyAutoFilter(
  session: RiskSession,
  enabled: boolean,
): number {
  if (!enabled) {
    return 0;
  }
  let applied = 0;
  for (const tab of session.listAll()) {
    if (!isAutoFilterCandidate(tab.assessment)) {
      continue;
    }
    if (session.decision(tab.uri) !== "pending") {
      continue;
    }
    session.filter(tab.uri);
    applied += 1;
  }
  return applied;
}
