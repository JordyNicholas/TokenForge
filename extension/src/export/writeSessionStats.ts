import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isSessionStatsReport, type SessionStatsReport } from "@tokenforge/risk-core";
import type { RiskSession } from "../session/riskSession";
import { buildSessionStatsReport } from "./buildSessionStats";
import { ensureTokenforgeGitignored } from "./gitignore";
import { sessionStatsFingerprint } from "./sessionStatsFingerprint";
import {
  LAST_SCAN_DIR,
  resolveWorkspaceRoot,
  teamLabel,
  repoLabel,
} from "./writeLastScan";

export const SESSION_STATS_FILE = "session-stats.json";

export type ExportSessionStatsResult = {
  reportPath: string;
  sessionAvoidedTokens: number;
  wrote: boolean;
};

async function readExistingFingerprint(reportPath: string): Promise<string | undefined> {
  try {
    const raw = await readFile(reportPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isSessionStatsReport(parsed)) {
      return undefined;
    }
    return sessionStatsFingerprint(parsed);
  } catch {
    return undefined;
  }
}

function assertValidSessionStats(report: SessionStatsReport): SessionStatsReport {
  if (!isSessionStatsReport(report)) {
    throw new Error("Invalid session-stats.json payload");
  }
  return report;
}

export async function writeSessionStats(
  session: RiskSession,
  nowMs: number = Date.now(),
): Promise<ExportSessionStatsResult> {
  const root = resolveWorkspaceRoot();
  const report = assertValidSessionStats(
    buildSessionStatsReport({
      repo: repoLabel(root),
      team: teamLabel(),
      timestamp: new Date(nowMs).toISOString(),
      sessionAvoidedTokens: session.sessionAvoidedTokens(),
      sessionHistory: session.sessionHistory(),
    }),
  );

  await ensureTokenforgeGitignored(root);

  const dir = join(root, LAST_SCAN_DIR);
  await mkdir(dir, { recursive: true });
  const reportPath = join(dir, SESSION_STATS_FILE);
  const nextFingerprint = sessionStatsFingerprint(report);
  const previousFingerprint = await readExistingFingerprint(reportPath);

  if (previousFingerprint === nextFingerprint) {
    return {
      reportPath,
      sessionAvoidedTokens: report.sessionAvoidedTokens,
      wrote: false,
    };
  }

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    reportPath,
    sessionAvoidedTokens: report.sessionAvoidedTokens,
    wrote: true,
  };
}
