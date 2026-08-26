import type { ProviderId, TokenRiskReport } from "@tokenforge/risk-core";

/**
 * How apply should persist this file (#130).
 * - `overwrite` — replace the whole file (TokenForge-owned sidecars, YAML packs).
 * - `merge-section` — insert/update a `<!-- tokenforge:begin/end -->` block in the
 *   provider’s conventional instruction markdown (preserve user text outside it).
 */
export type PolicyWriteMode = "overwrite" | "merge-section";

/** One file the Fix adapter would write relative to the scanned repo root. */
export type PolicyFile = {
  path: string;
  /** For `merge-section`, the lean body only (markers added at write time). */
  contents: string;
  writeMode?: PolicyWriteMode;
};

export type ProviderAdapter = {
  id: ProviderId;
  /** Build lean instruction + exclusion files from a scan report. No I/O. */
  render(report: TokenRiskReport): PolicyFile[];
};
