import type {
  ScanLayer,
  ScanLayerId,
  ScanLayers,
  TokenRiskFinding,
  TokenRiskReport,
  TokenRiskTotals,
} from "../domain/types";
import { mergeFindings } from "../merge/merge";
import { tallyCombinedTotals, tallyHeuristicTotals, tallyLlmTotals } from "./totals";

const EMPTY_TOTALS: TokenRiskTotals = {
  beforeTokens: 0,
  afterTokens: 0,
  savedTokens: 0,
};

function findingsForLayer(
  report: TokenRiskReport,
  layerId: ScanLayerId,
): TokenRiskFinding[] {
  if (report.layers) {
    return [...report.layers[layerId].findings];
  }

  if (layerId === "heuristic") {
    return report.findings.filter(
      (finding) =>
        finding.source === undefined ||
        finding.source === "heuristic" ||
        finding.source === "combined",
    );
  }

  if (layerId === "llm") {
    return report.findings.filter((finding) => finding.source === "llm");
  }

  return [...report.findings];
}

function totalsForLayer(report: TokenRiskReport, layerId: ScanLayerId): TokenRiskTotals {
  if (report.layers) {
    return report.layers[layerId].totals;
  }

  if (layerId === "combined" || layerId === "heuristic") {
    return report.totals;
  }

  const llmFindings = findingsForLayer(report, "llm");
  return tallyLlmTotals(0, llmFindings);
}

/** Resolve one scan layer from a report (explicit layers or legacy findings). */
export function resolveScanLayer(
  report: TokenRiskReport,
  layerId: ScanLayerId,
): ScanLayer {
  return {
    findings: findingsForLayer(report, layerId),
    totals: totalsForLayer(report, layerId),
  };
}

/** Resolve all scan layers; synthesizes from legacy reports when `layers` is absent. */
export function resolveScanLayers(report: TokenRiskReport): ScanLayers {
  if (report.layers) {
    return report.layers;
  }

  const heuristicFindings = findingsForLayer(report, "heuristic");
  const llmFindings = findingsForLayer(report, "llm");
  const combinedFindings =
    llmFindings.length > 0
      ? mergeFindings(heuristicFindings, llmFindings)
      : [...report.findings];

  return {
    heuristic: {
      findings: heuristicFindings,
      totals: report.totals,
    },
    llm: {
      findings: llmFindings,
      totals: tallyLlmTotals(0, llmFindings),
    },
    combined: {
      findings: combinedFindings,
      totals: report.totals,
    },
  };
}

/** Build a report view for one layer (findings + totals swapped; metadata preserved). */
export function reportForLayer(
  report: TokenRiskReport,
  layerId: ScanLayerId,
): TokenRiskReport {
  const layer = resolveScanLayer(report, layerId);
  return {
    ...report,
    findings: layer.findings,
    totals: layer.totals,
  };
}

export function hasLlmLayerData(report: TokenRiskReport): boolean {
  return resolveScanLayer(report, "llm").findings.length > 0;
}

export function emptyLayerTotals(): TokenRiskTotals {
  return { ...EMPTY_TOTALS };
}
