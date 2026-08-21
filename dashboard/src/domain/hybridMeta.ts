import type { ScanLlmMetadata, TokenRiskReport } from "@tokenforge/risk-core";

export type HybridScanSummary = {
  team: string;
  repo: string;
  llm: ScanLlmMetadata;
};

/** Collect hybrid `scan.llm` blocks from loaded reports (skips noop). */
export function listHybridScanSummaries(
  reports: readonly TokenRiskReport[],
): HybridScanSummary[] {
  const rows: HybridScanSummary[] = [];
  for (const report of reports) {
    const llm = report.scan?.llm;
    if (!llm || llm.backend === "noop") {
      continue;
    }
    rows.push({ team: report.team, repo: report.repo, llm });
  }
  return rows;
}
