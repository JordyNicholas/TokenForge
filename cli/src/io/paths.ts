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
export const DISCOVER_LATEST_FILE = "discover-latest.json";
export const USAGE_LATEST_FILE = "usage-latest.json";
export const USAGE_SYNC_CONFIG_FILE = "usage-sync.json";
export const PROVE_CHANGE_LATEST_FILE = "prove-change-latest.json";
export const PROVE_CHANGES_TRAIL_FILE = "prove-changes.jsonl";

export function tokenforgeDir(root: string): string {
  return join(root, ".tokenforge");
}

export function scanReportPath(root: string): string {
  return join(tokenforgeDir(root), SCAN_REPORT_FILE);
}

export function discoverLatestPath(root: string): string {
  return join(tokenforgeDir(root), DISCOVER_LATEST_FILE);
}

/** Latest Fix apply/org-pack marker for Prove attribution (#95). */
export function proveChangeLatestPath(root: string): string {
  return join(tokenforgeDir(root), PROVE_CHANGE_LATEST_FILE);
}

/** Append-only Prove change trail (one JSON object per line). */
export function proveChangesTrailPath(root: string): string {
  return join(tokenforgeDir(root), PROVE_CHANGES_TRAIL_FILE);
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
