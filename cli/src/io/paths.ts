import { basename, join } from "node:path";

/** Directories the repo walker never enters. */
export const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".tokenforge",
  ".cursor",
  ".idea",
  "coverage",
]);

export const SCAN_REPORT_FILE = "scan-report.json";
export const USAGE_LATEST_FILE = "usage-latest.json";
export const USAGE_SYNC_CONFIG_FILE = "usage-sync.json";

export function tokenforgeDir(root: string): string {
  return join(root, ".tokenforge");
}

export function scanReportPath(root: string): string {
  return join(tokenforgeDir(root), SCAN_REPORT_FILE);
}

/** Period-scoped Prove usage snapshot, e.g. `.tokenforge/usage-2026-08.json`. */
export function usageMetricsPath(root: string, period: string): string {
  return join(tokenforgeDir(root), `usage-${period.trim()}.json`);
}

/** Latest synced usage snapshot for cron / Prove handoff. */
export function usageLatestPath(root: string): string {
  return join(tokenforgeDir(root), USAGE_LATEST_FILE);
}

export function usageSyncConfigPath(root: string): string {
  return join(tokenforgeDir(root), USAGE_SYNC_CONFIG_FILE);
}

export function defaultRepoLabel(root: string): string {
  return basename(root) || "local";
}
