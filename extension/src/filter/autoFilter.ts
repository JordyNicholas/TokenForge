import type { ShieldMode } from "@tokenforge/context-adapters";
import { HIGH_RISK_FILE_CLASSES, type RiskAssessment } from "@tokenforge/risk-core";
import type { TabDecision } from "./types";
import type { TrackedTab } from "../tabs/types";

export function isAutoFilterCandidate(assessment: RiskAssessment): boolean {
  return HIGH_RISK_FILE_CLASSES.has(assessment.fileClass);
}

/**
 * Minimal session surface auto-shield needs. Structurally satisfied by
 * ShieldSession; declared here so the loop is unit-testable without VS Code.
 */
export interface AutoShieldSession {
  listAll(nowMs?: number): readonly TrackedTab[];
  decision(uri: string): TabDecision;
  shield(uri: string, options?: { mode?: ShieldMode }): Promise<unknown>;
}

/**
 * When enabled, pending lockfile / generated / media tabs are Shielded with
 * real provider levers (writes the provider ignore file + audit trail), exactly
 * like a manual Shield — not an estimate-only Filter. This is the fix for the
 * gap where auto-shield only updated the readout: it called `filter()`, so
 * `.cursorignore` was never written and the agent still read the file.
 *
 * Tabs the user has Allowed or already Shielded are left alone so those stay
 * durable overrides.
 */
export async function applyAutoShield(
  session: AutoShieldSession,
  enabled: boolean,
): Promise<number> {
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
    await session.shield(tab.uri, { mode: "hard" });
    applied += 1;
  }
  return applied;
}
