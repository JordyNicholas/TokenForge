import {
  resolveScanLayers,
  type ScanLlmMetadata,
  type TokenRiskFinding,
  type TokenRiskReport,
} from "@tokenforge/risk-core";

export type WriteLastScanHybrid = {
  llmFindings: readonly TokenRiskFinding[];
  llmMeta: ScanLlmMetadata;
  llmCandidateTokens: number;
};

/**
 * Recover hybrid LLM payload from an on-disk last-scan so auto-export can
 * refresh open-tab heuristics without wiping Analyze rules results.
 */
export function hybridFromExistingReport(
  report: TokenRiskReport,
): WriteLastScanHybrid | undefined {
  const layers = resolveScanLayers(report);
  const llmFindings: TokenRiskFinding[] = [...layers.llm.findings];
  const llmMeta: ScanLlmMetadata | undefined = report.scan?.llm;
  const isHybrid =
    report.scan?.mode === "hybrid" || llmFindings.length > 0 || llmMeta !== undefined;
  if (!isHybrid) {
    return undefined;
  }
  return {
    llmFindings,
    llmMeta: llmMeta ?? {
      backend: "noop",
      model: "none",
      durationMs: 0,
      candidatesSent: llmFindings.length,
    },
    llmCandidateTokens: layers.llm.totals.beforeTokens,
  };
}
