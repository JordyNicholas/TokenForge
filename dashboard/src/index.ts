import {
  TOKEN_RISK_REPORT_SCHEMA_ID,
  isTokenRiskReport,
  type TokenRiskReport,
} from "@tokenforge/risk-core";

/** Seeded demo data and JSON load must match this schema (E3 #19). */
export const DASHBOARD_REPORT_SCHEMA_ID = TOKEN_RISK_REPORT_SCHEMA_ID;

/** Placeholder until E3 (#16) scaffolds the Vite React app. */
export function dashboardPlaceholder(input?: unknown): number {
  const report: TokenRiskReport | undefined = isTokenRiskReport(input)
    ? input
    : undefined;
  return report?.totals.savedTokens ?? 0;
}
