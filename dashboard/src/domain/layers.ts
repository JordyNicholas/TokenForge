import {
  reportForLayer,
  resolveScanLayer,
  type LlmAnalysisOverview,
  type ScanLayerId,
  type TokenRiskReport,
  type TokenRiskTotals,
} from "@tokenforge/risk-core";

export type { ScanLayerId };

export const SCAN_LAYER_LABELS: Record<ScanLayerId, string> = {
  combined: "Combined",
  heuristic: "Heuristic",
  llm: "LLM",
};

export const SCAN_LAYER_LEADS: Record<ScanLayerId, string> = {
  combined:
    "Merged heuristic + LLM findings. Fix adapters and top-level totals use this layer.",
  heuristic:
    "Deterministic scan — file size, path class, and inactivity. No model calls.",
  llm:
    "Semantic enrichment from the optional hybrid pass (local or external model).",
};

/** Short manager-facing hints for scan-board rows and tooltips. */
export const SCAN_LAYER_HINTS: Record<ScanLayerId, string> = {
  combined: "Merged baseline + optional semantic pass",
  heuristic: "Deterministic baseline — no model",
  llm: "Optional semantic enrichment",
};

export const LLM_BOARD_LOCKED_HINT =
  "Run a hybrid scan (tokenforge scan --mode hybrid) and load the report to unlock.";

/** Count actionable findings on a layer (excluded / filtered). */
export function layerActionableFindingCount(
  reports: readonly TokenRiskReport[],
  layerId: ScanLayerId,
): number {
  return reportsForLayer(reports, layerId).reduce((sum, report) => {
    return (
      sum +
      report.findings.filter(
        (finding) => finding.action === "excluded" || finding.action === "filtered",
      ).length
    );
  }, 0);
}

const LAYER_IDS = new Set<ScanLayerId>(["heuristic", "llm", "combined"]);

export function parseScanLayerId(value: string | undefined): ScanLayerId | undefined {
  if (value !== undefined && LAYER_IDS.has(value as ScanLayerId)) {
    return value as ScanLayerId;
  }
  return undefined;
}

export {
  boardScopeBase,
  boardSubpath,
  boardViewSuffix,
  parseBoardLayerFromPath,
  parseTeamIdFromPath,
} from "./teamScope";

export function reportsForLayer(
  reports: readonly TokenRiskReport[],
  layerId: ScanLayerId,
): TokenRiskReport[] {
  return reports.map((report) => reportForLayer(report, layerId));
}

export function aggregateLayerTotals(
  reports: readonly TokenRiskReport[],
  layerId: ScanLayerId,
): TokenRiskTotals {
  return reports.reduce<TokenRiskTotals>(
    (acc, report) => {
      const totals = resolveScanLayer(report, layerId).totals;
      return {
        beforeTokens: acc.beforeTokens + totals.beforeTokens,
        afterTokens: acc.afterTokens + totals.afterTokens,
        savedTokens: acc.savedTokens + totals.savedTokens,
      };
    },
    { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
  );
}

export function seedHasLlmLayer(reports: readonly TokenRiskReport[]): boolean {
  return reports.some((report) => reportHasHybridLlm(report));
}

/** True when a report ran hybrid enrichment (even if the model returned zero findings). */
export function reportHasHybridLlm(report: TokenRiskReport): boolean {
  if (report.scan?.mode === "hybrid" && report.scan.llm?.backend !== "noop") {
    return true;
  }
  return resolveScanLayer(report, "llm").findings.length > 0;
}

/** Optional Pass C analysis capsule from `scan.llm.analysisOverview`. */
export function getLlmAnalysisOverview(
  report: TokenRiskReport,
): LlmAnalysisOverview | undefined {
  return report.scan?.llm?.analysisOverview;
}
