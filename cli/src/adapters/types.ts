import type { ProviderId, TokenRiskReport } from "@tokenforge/risk-core";

/** One file the Fix adapter would write relative to the scanned repo root. */
export type PolicyFile = {
  path: string;
  contents: string;
};

export type ProviderAdapter = {
  id: ProviderId;
  /** Build lean instruction + exclusion files from a scan report. No I/O. */
  render(report: TokenRiskReport): PolicyFile[];
};
