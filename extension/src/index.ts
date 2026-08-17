import {
  INACTIVE_MS,
  TOKEN_RISK_REPORT_SCHEMA_ID,
  scoreRisk,
} from "@tokenforge/risk-core";

/** `.tokenforge/last-scan.json` must match this schema (E4 #22). */
export const LAST_SCAN_SCHEMA_ID = TOKEN_RISK_REPORT_SCHEMA_ID;

/** Placeholder until E4 (#20) scaffolds the VS Code extension. */
export function extensionPlaceholder(): boolean {
  return scoreRisk({ path: "src/index.ts", bytes: 0, inactiveMs: 0 }).score <
    scoreRisk({ path: "src/index.ts", bytes: 0, inactiveMs: INACTIVE_MS }).score;
}
