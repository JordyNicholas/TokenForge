import type { TokenRiskReport } from "@tokenforge/risk-core";

/** Placeholder until E3 (#16) scaffolds the Vite React app. */
export function dashboardPlaceholder(report?: TokenRiskReport): number {
  return report?.totals.savedTokens ?? 0;
}
