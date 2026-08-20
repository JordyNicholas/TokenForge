import {
  isTokenRiskReport,
  primaryReason,
  tallyCombinedTotals,
  type ProviderId,
  type TokenRiskFinding,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import type { TabDecision } from "../filter/types";
import type { TrackedTab } from "../tabs/types";

export type BuildLastScanInput = {
  tabs: readonly TrackedTab[];
  decisionFor: (uri: string) => TabDecision;
  repo: string;
  team: string;
  provider: ProviderId;
  timestamp?: string;
};

/**
 * Build a v0 Token Risk report from open tabs + Keep/Filter decisions.
 *
 * - Only at-risk tabs become findings.
 * - `filtered` → action filtered (counts as saved in totals).
 * - `kept` / `pending` → action kept (still in afterTokens).
 */
export function buildLastScanReport(input: BuildLastScanInput): TokenRiskReport {
  const assessments = input.tabs.map((tab) => tab.assessment);
  const findings: TokenRiskFinding[] = [];

  for (const tab of input.tabs) {
    if (!tab.assessment.atRisk) {
      continue;
    }
    const reason = primaryReason(tab.assessment.reasons);
    if (reason === undefined) {
      continue;
    }
    const decision = input.decisionFor(tab.uri);
    findings.push({
      path: tab.path,
      reason,
      bytes: tab.assessment.bytes,
      estTokens: tab.assessment.estTokens,
      action: decision === "filtered" ? "filtered" : "kept",
      source: "heuristic",
    });
  }

  const totals = tallyCombinedTotals(assessments, findings);

  return {
    source: "extension",
    timestamp: input.timestamp ?? new Date().toISOString(),
    repo: input.repo,
    team: input.team,
    provider: input.provider,
    findings,
    totals,
  };
}

export function assertValidLastScan(report: TokenRiskReport): TokenRiskReport {
  if (!isTokenRiskReport(report)) {
    throw new Error("last-scan report failed Token Risk v0 validation");
  }
  return report;
}
