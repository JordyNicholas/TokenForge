import { TOKEN_RISK_REPORT_SCHEMA_ID } from "@tokenforge/risk-core";

/** `.tokenforge/scan-report.json` must match this schema. */
export const SCAN_REPORT_SCHEMA_ID = TOKEN_RISK_REPORT_SCHEMA_ID;

export { runCli, type CliIo } from "./app/cli";
export { UsageError, RuntimeError } from "./app/errors";
export { writeScanReport, readScanReport, tryReadScanReport } from "./io/report-file";
export { scanRepo, parseProviderId, type ScanOptions, type ScanResult } from "./commands/scan/scan";
export { applyPolicy, initRepo, type ApplyOptions, type ApplyResult } from "./commands/apply/apply";
export { formatScanTable, formatTotals } from "./output/table";
export { savedPercent, formatSavedPercent, totalsPayload, savingsExitCode } from "./savings/savings";
export {
  getAdapter,
  copilotAdapter,
  genericAdapter,
  COPILOT_INSTRUCTIONS_PATH,
  COPILOT_EXCLUSIONS_PATH,
  MAX_INSTRUCTION_BYTES,
} from "./adapters";
export {
  createFixtureUsageProvider,
  getUsageProvider,
  type FetchUsageQuery,
  type FixtureUsageProviderOptions,
  type ResolveUsageProviderOptions,
  type UsageProvider,
  type UsageProviderId,
} from "./usage";
