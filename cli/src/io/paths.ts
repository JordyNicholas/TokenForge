import { basename, join } from "node:path";

/** Directories the repo walker never enters. */
export const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".tokenforge",
  ".idea",
  "coverage",
]);

/** Ephemeral subtrees under `.cursor/` that must not be scanned. */
export const CURSOR_EPHEMERAL_DIR_NAMES = new Set(["cache", "logs", "tmp"]);

/**
 * Whether a directory entry should be skipped during repo walk.
 * `.cursor/` itself is walkable; only ephemeral subtrees (e.g. cache) are skipped.
 */
export function shouldSkipWalkDirectory(
  dirName: string,
  relativeParentDir: string,
): boolean {
  if (SKIP_DIR_NAMES.has(dirName)) {
    return true;
  }
  const parent =
    relativeParentDir.replaceAll("\\", "/").replace(/\/$/, "") || ".";
  if (parent === ".cursor" || parent.endsWith("/.cursor")) {
    return CURSOR_EPHEMERAL_DIR_NAMES.has(dirName);
  }
  return false;
}

export const SCAN_REPORT_FILE = "scan-report.json";
export const DISCOVER_LATEST_FILE = "discover-latest.json";
export const USAGE_LATEST_FILE = "usage-latest.json";
export const USAGE_SYNC_CONFIG_FILE = "usage-sync.json";
export const PROVE_CHANGE_LATEST_FILE = "prove-change-latest.json";
export const PROVE_CHANGES_TRAIL_FILE = "prove-changes.jsonl";
export const PROVE_HANDOFF_FILE = "prove-handoff.json";
export const PROVE_REPORT_FILE = "prove-report.md";
export const HONOR_SMOKE_FILE = "honor-smoke.json";
export const SESSION_STATS_FILE = "session-stats.json";
export const PROVE_PACK_FILE = "prove-pack.json";
export const APPLY_SNAPSHOT_BEFORE_FILE = "scan-before-apply.json";
export const APPLY_SNAPSHOT_AFTER_FILE = "scan-after-apply.json";
export const APPLY_SECTION_HASH_FILE = "apply-section-hash.json";

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

export function proveHandoffPath(root: string): string {
  return join(tokenforgeDir(root), PROVE_HANDOFF_FILE);
}

export function proveReportPath(root: string): string {
  return join(tokenforgeDir(root), PROVE_REPORT_FILE);
}

/** Host-honor smoke checklist for Cursor Soft/Hard (#F24-A). */
export function honorSmokePath(root: string): string {
  return join(tokenforgeDir(root), HONOR_SMOKE_FILE);
}

export function sessionStatsPath(root: string): string {
  return join(tokenforgeDir(root), SESSION_STATS_FILE);
}

/** Optional staged org prove-pack under `.tokenforge/` (default CLI out is walk-root). */
export function provePackPath(root: string): string {
  return join(tokenforgeDir(root), PROVE_PACK_FILE);
}

export function applySnapshotBeforePath(root: string): string {
  return join(tokenforgeDir(root), APPLY_SNAPSHOT_BEFORE_FILE);
}

export function applySnapshotAfterPath(root: string): string {
  return join(tokenforgeDir(root), APPLY_SNAPSHOT_AFTER_FILE);
}

export function applySectionHashPath(root: string): string {
  return join(tokenforgeDir(root), APPLY_SECTION_HASH_FILE);
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
