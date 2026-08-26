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
  COPILOT_CANONICAL_INSTRUCTIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  COPILOT_EXCLUSIONS_PATH,
  MAX_INSTRUCTION_BYTES,
} from "./adapters";
export {
  createFixtureUsageProvider,
  createCopilotUsageProvider,
  createCursorUsageProvider,
  createClaudeUsageProvider,
  getUsageProvider,
  parseUsagePeriod,
  type CopilotUsageProviderOptions,
  type CursorUsageProviderOptions,
  type ClaudeUsageProviderOptions,
  type FetchUsageQuery,
  type FixtureUsageProviderOptions,
  type ResolveUsageProviderOptions,
  type UsageProvider,
  type UsageProviderId,
} from "./usage";
export { pullUsage, type UsagePullOptions, type UsagePullResult } from "./commands/usage-pull/usage-pull";
export { syncUsage, type UsageSyncOptions, type UsageSyncResult } from "./commands/usage-sync/usage-sync";
export {
  usageMetricsPath,
  usageLatestPath,
  usageSyncConfigPath,
} from "./io/paths";
export { syncUsage, type UsageSyncOptions, type UsageSyncResult } from "./commands/usage-sync/usage-sync";
export {
  usageMetricsPath,
  usageLatestPath,
  usageSyncConfigPath,
} from "./io/paths";

