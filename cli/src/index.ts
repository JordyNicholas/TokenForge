import { TOKEN_RISK_REPORT_SCHEMA_ID } from "@tokenforge/risk-core";

/** `.tokenforge/scan-report.json` must match this schema. */
export const SCAN_REPORT_SCHEMA_ID = TOKEN_RISK_REPORT_SCHEMA_ID;

export { runCli, type CliIo } from "./cli";
export { UsageError, RuntimeError } from "./errors";
export { scanRepo, parseProviderId, type ScanOptions, type ScanResult } from "./scan";
