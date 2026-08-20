import {
  primaryReason,
  tallyCombinedTotals,
  type FindingReason,
  type TokenRiskFinding,
  type TokenRiskTotals,
} from "@tokenforge/risk-core";
import type { TabDecision } from "../filter/types";
import type { TrackedTab } from "../tabs/types";

export type RiskPulseSegment = {
  path: string;
  uri: string;
  tokens: number;
  decision: TabDecision;
  reason: FindingReason;
};

export type RiskPulseModel = {
  totals: TokenRiskTotals;
  /** Tokens still shown as at-risk in the status bar (excludes filtered). */
  displayAtRiskTokens: number;
  pendingCount: number;
  keptCount: number;
  filteredCount: number;
  /** At-risk tabs, largest first — evidence for the reduction bar. */
  segments: RiskPulseSegment[];
};

/** True only when Filter has created real before≠after savings to show. */
export function hasTokenReduction(model: RiskPulseModel): boolean {
  return model.totals.savedTokens > 0 && model.totals.afterTokens !== model.totals.beforeTokens;
}

/**
 * Live Detect pulse from open tabs + Keep/Filter decisions.
 * Same totals math as last-scan export (`tallyCombinedTotals`).
 */
export function buildRiskPulseModel(
  tabs: readonly TrackedTab[],
  decisionFor: (uri: string) => TabDecision,
): RiskPulseModel {
  const assessments = tabs.map((tab) => tab.assessment);
  const findings: TokenRiskFinding[] = [];
  const segments: RiskPulseSegment[] = [];
  let pendingCount = 0;
  let keptCount = 0;
  let filteredCount = 0;
  let displayAtRiskTokens = 0;

  for (const tab of tabs) {
    if (!tab.assessment.atRisk) {
      continue;
    }
    const reason = primaryReason(tab.assessment.reasons);
    if (reason === undefined) {
      continue;
    }
    const decision = decisionFor(tab.uri);
    findings.push({
      path: tab.path,
      reason,
      bytes: tab.assessment.bytes,
      estTokens: tab.assessment.estTokens,
      action: decision === "filtered" ? "filtered" : "kept",
      source: "heuristic",
    });
    segments.push({
      path: tab.path,
      uri: tab.uri,
      tokens: tab.assessment.estTokens,
      decision,
      reason,
    });

    if (decision === "filtered") {
      filteredCount += 1;
    } else if (decision === "kept") {
      keptCount += 1;
      displayAtRiskTokens += tab.assessment.estTokens;
    } else {
      pendingCount += 1;
      displayAtRiskTokens += tab.assessment.estTokens;
    }
  }

  segments.sort((a, b) => b.tokens - a.tokens);

  return {
    totals: tallyCombinedTotals(assessments, findings),
    displayAtRiskTokens,
    pendingCount,
    keptCount,
    filteredCount,
    segments,
  };
}
