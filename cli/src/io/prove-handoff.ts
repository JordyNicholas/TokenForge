import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import type { ProveChangeMarker, TokenRiskReport } from "@tokenforge/risk-core";
import {
  applySnapshotAfterPath,
  applySnapshotBeforePath,
  discoverLatestPath,
  proveChangeLatestPath,
  proveHandoffPath,
  scanReportPath,
  sessionStatsPath,
  usageLatestPath,
} from "./paths";

export type ProveHandoff = {
  schemaVersion: 1;
  createdAt: string;
  root: string;
  team: string;
  repo: string;
  provider: string;
  reportPath: string;
  changeMarkerPath: string | null;
  usageLatestPath: string | null;
  sessionStatsPath: string | null;
  snapshotBeforePath: string | null;
  snapshotAfterPath: string | null;
  discoverLatestPath: string | null;
  /** Dashboard query string (leading ?). Paths are repo-relative file URLs for local serve. */
  dashboardQuery: string;
  dashboardUrlHint: string;
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toPosixRel(root: string, abs: string): string {
  return relative(root, abs).split("\\").join("/");
}

/**
 * Build Prove handoff JSON + dashboard URL hint for local Vite (`:5173`).
 * Query params use absolute file paths only when staging to dashboard/public;
 * default uses same-origin public copies when present, else documents .tokenforge paths.
 */
export async function writeProveHandoff(options: {
  root: string;
  report: TokenRiskReport;
  changeMarker?: ProveChangeMarker | null;
  dashboardBaseUrl?: string;
}): Promise<ProveHandoff> {
  const root = resolve(options.root);
  const reportPath = scanReportPath(root);
  const markerPath = proveChangeLatestPath(root);
  const usagePath = usageLatestPath(root);
  const sessionPath = sessionStatsPath(root);
  const beforePath = applySnapshotBeforePath(root);
  const afterPath = applySnapshotAfterPath(root);
  const discoverPath = discoverLatestPath(root);

  const hasMarker =
    Boolean(options.changeMarker) || (await exists(markerPath));
  const hasUsage = await exists(usagePath);
  const hasSession = await exists(sessionPath);
  const hasBefore = await exists(beforePath);
  const hasAfter = await exists(afterPath);
  const hasDiscover = await exists(discoverPath);

  const params = new URLSearchParams();
  // Prefer staged public copies when pilot --prove staged them; else leave src for operator.
  params.set("src", "/last-scan.json");
  params.set("afterUsage", "/sample-usage-after.csv");
  if (hasMarker) {
    params.set("markers", "/prove-change-latest.json");
  }
  if (hasSession) {
    params.set("session", "/session-stats.json");
  }
  if (hasDiscover) {
    params.set("discover", "/discover-latest.json");
  }

  const query = `?${params.toString()}`;
  const base = options.dashboardBaseUrl ?? "http://127.0.0.1:5173/board/combined";
  const handoff: ProveHandoff = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    root,
    team: options.report.team,
    repo: options.report.repo,
    provider: options.report.provider,
    reportPath: toPosixRel(root, reportPath),
    changeMarkerPath: hasMarker ? toPosixRel(root, markerPath) : null,
    usageLatestPath: hasUsage ? toPosixRel(root, usagePath) : null,
    sessionStatsPath: hasSession ? toPosixRel(root, sessionPath) : null,
    snapshotBeforePath: hasBefore ? toPosixRel(root, beforePath) : null,
    snapshotAfterPath: hasAfter ? toPosixRel(root, afterPath) : null,
    discoverLatestPath: hasDiscover ? toPosixRel(root, discoverPath) : null,
    dashboardQuery: query,
    dashboardUrlHint: `${base}${query}`,
  };

  await mkdir(dirname(proveHandoffPath(root)), { recursive: true });
  await writeFile(proveHandoffPath(root), `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
  return handoff;
}

/** Copy Prove artifacts into dashboard/public for ?src= same-origin boot. */
export async function stageProveArtifactsForDashboard(options: {
  root: string;
  dashboardPublicDir: string;
}): Promise<string[]> {
  const root = resolve(options.root);
  const pub = resolve(options.dashboardPublicDir);
  await mkdir(pub, { recursive: true });
  const copied: string[] = [];
  const pairs: Array<[string, string]> = [
    [scanReportPath(root), "last-scan.json"],
    [proveChangeLatestPath(root), "prove-change-latest.json"],
    [sessionStatsPath(root), "session-stats.json"],
    [applySnapshotAfterPath(root), "scan-after-apply.json"],
    [discoverLatestPath(root), "discover-latest.json"],
  ];
  for (const [src, name] of pairs) {
    if (await exists(src)) {
      const dest = resolve(pub, name);
      await copyFile(src, dest);
      copied.push(name);
    }
  }
  return copied;
}
