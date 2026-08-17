import { TOKEN_RISK_REPORT_SCHEMA_ID } from "@tokenforge/risk-core";

/** `.tokenforge/scan-report.json` must match this schema. */
export const SCAN_REPORT_SCHEMA_ID = TOKEN_RISK_REPORT_SCHEMA_ID;

export { runCli, type CliIo } from "./cli";
export { UsageError, RuntimeError } from "./errors";
export { writeScanReport, readScanReport, tryReadScanReport } from "./report-file";
export { scanRepo, parseProviderId, type ScanOptions, type ScanResult } from "./scan";
export { applyPolicy, initRepo, type ApplyOptions, type ApplyResult } from "./apply";
export { formatScanTable, formatTotals } from "./table";
export { savedPercent, formatSavedPercent, totalsPayload, savingsExitCode } from "./savings";
export {
  getAdapter,
  copilotAdapter,
  genericAdapter,
  COPILOT_INSTRUCTIONS_PATH,
  COPILOT_EXCLUSIONS_PATH,
  MAX_INSTRUCTION_BYTES,
} from "./adapters";
