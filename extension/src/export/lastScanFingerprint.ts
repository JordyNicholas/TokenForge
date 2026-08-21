import type { TokenRiskReport } from "@tokenforge/risk-core";

/** Stable fingerprint for skip-if-unchanged auto-export (ignores timestamp). */
export function lastScanFingerprint(report: TokenRiskReport): string {
  const { timestamp: _timestamp, ...rest } = report;
  return JSON.stringify(rest);
}
