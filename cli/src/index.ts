import {
  TOKEN_RISK_REPORT_SCHEMA_ID,
  estimateTokens,
} from "@tokenforge/risk-core";

/** `.tokenforge/scan-report.json` must match this schema (E2 #13). */
export const SCAN_REPORT_SCHEMA_ID = TOKEN_RISK_REPORT_SCHEMA_ID;

/** Placeholder until E2 (#13) implements `tokenforge scan | apply | init`. */
export function cliPlaceholder(): number {
  return estimateTokens(0);
}
