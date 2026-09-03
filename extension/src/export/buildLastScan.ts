import {
  buildScanLayers,
  isTokenRiskReport,
  primaryReason,
  tallyCombinedTotals,
  type ProviderId,
  type ScanLlmMetadata,
  type TokenRiskFinding,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import type { TabDecision } from "../filter/types";
import { isTokenforgeArtifactPath } from "../paths/tokenforgeArtifacts";
import type { TrackedTab } from "../tabs/types";

export type BuildLastScanInput = {
  tabs: readonly TrackedTab[];
  decisionFor: (uri: string) => TabDecision;
  repo: string;
  team: string;
  provider: ProviderId;
  timestamp?: string;
  /** Optional LLM findings from instruction-path enrichment (#48). */
  llmFindings?: readonly TokenRiskFinding[];
  llmMeta?: ScanLlmMetadata;
  llmCandidateTokens?: number;
};

/**
 * Build a v0 Token Risk report from open tabs + Keep/Filter decisions.
 *
 * - Only at-risk tabs become heuristic findings.
 * - `filtered` → action filtered (counts as saved in totals).
 * - `kept` / `pending` → action kept (still in afterTokens).
 * - When `llmFindings` are present, emit hybrid `layers` + `scan` metadata.
 * - Every open tab is listed in `activePaths` (except `.tokenforge/` artifacts),
 *   so a CLI run pointed at this file will not propose excluding a file the
 *   developer has open (#137). Idle tabs are included on purpose.
 */
/** Open-tab paths for CLI active-session (#137); skip TokenForge export files. */
function openPaths(tabs: readonly TrackedTab[]): string[] {
  const paths = new Set(
    tabs
      .map((tab) => tab.path.replaceAll("\\", "/"))
      .filter((path) => !isTokenforgeArtifactPath(path)),
  );
  return [...paths].sort((a, b) => a.localeCompare(b));
}

export function buildLastScanReport(input: BuildLastScanInput): TokenRiskReport {
  const sessionTabs = input.tabs.filter((tab) => !isTokenforgeArtifactPath(tab.path));
  const assessments = sessionTabs.map((tab) => tab.assessment);
  const activePaths = openPaths(input.tabs);
  const heuristicFindings: TokenRiskFinding[] = [];

  for (const tab of sessionTabs) {
    if (!tab.assessment.atRisk) {
      continue;
    }
    const reason = primaryReason(tab.assessment.reasons);
    if (reason === undefined) {
      continue;
    }
    const decision = input.decisionFor(tab.uri);
    heuristicFindings.push({
      path: tab.path,
      reason,
      bytes: tab.assessment.bytes,
      estTokens: tab.assessment.estTokens,
      action: decision === "filtered" ? "filtered" : "kept",
      source: "heuristic",
    });
  }

  const llmFindings = input.llmFindings ? [...input.llmFindings] : [];
  const hasHybrid = llmFindings.length > 0 || input.llmMeta !== undefined;

  if (!hasHybrid) {
    const totals = tallyCombinedTotals(assessments, heuristicFindings);
    return {
      source: "extension",
      timestamp: input.timestamp ?? new Date().toISOString(),
      repo: input.repo,
      team: input.team,
      provider: input.provider,
      findings: heuristicFindings,
      totals,
      // Omitted when no tabs are open: absent means "unknown", and an empty
      // array would read as "the developer has nothing open", which is a
      // different and stronger claim.
      ...(activePaths.length > 0 ? { activePaths } : {}),
    };
  }

  const layers = buildScanLayers({
    assessments,
    heuristicFindings,
    llmFindings,
    llmCandidateTokens: input.llmCandidateTokens ?? 0,
  });

  return {
    source: "extension",
    timestamp: input.timestamp ?? new Date().toISOString(),
    repo: input.repo,
    team: input.team,
    provider: input.provider,
    findings: layers.combined.findings,
    totals: layers.combined.totals,
    layers,
    scan: {
      mode: "hybrid",
      llm: input.llmMeta ?? {
        backend: "noop",
        model: "none",
        durationMs: 0,
        candidatesSent: llmFindings.length,
      },
    },
    ...(activePaths.length > 0 ? { activePaths } : {}),
  };
}

export function assertValidLastScan(report: TokenRiskReport): TokenRiskReport {
  if (!isTokenRiskReport(report)) {
    throw new Error("last-scan report failed Token Risk v0 validation");
  }
  return report;
}
