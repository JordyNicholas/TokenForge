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

export function tokenforgeDir(root: string): string {
  return join(root, ".tokenforge");
}

export function scanReportPath(root: string): string {
  return join(tokenforgeDir(root), SCAN_REPORT_FILE);
}

export function defaultRepoLabel(root: string): string {
  return basename(root) || "local";
}
