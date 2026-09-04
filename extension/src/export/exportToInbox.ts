import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { workspace } from "vscode";
import type { RiskSession } from "../session/riskSession";
import { LAST_SCAN_DIR, LAST_SCAN_FILE, repoLabel, resolveWorkspaceRoot, teamLabel } from "./writeLastScan";
import { SESSION_STATS_FILE } from "./writeSessionStats";

const LOCAL_TEAM_LABELS = new Set(["", "default", "local"]);

export type ExportToInboxResult = {
  destDir: string;
  copied: string[];
};

export function inboxPath(): string | null {
  const configured = workspace.getConfiguration("tokenforge").get<string>("inboxPath");
  const trimmed = configured?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function assertExportableTeam(team: string): void {
  if (LOCAL_TEAM_LABELS.has(team.trim())) {
    throw new Error(
      `Team label "${team || "(empty)"}" is not exportable. Set tokenforge.team to a real team id (not local/default) via TokenForge: Set team label.`,
    );
  }
}

/** Copy last-scan + session-stats into {inboxPath}/{team}/{repo}/.tokenforge/. */
export async function exportToInbox(
  session: RiskSession,
  writeArtifacts: () => Promise<{ lastScanPath: string; sessionStatsPath: string }>,
): Promise<ExportToInboxResult> {
  const inboxRoot = inboxPath();
  if (!inboxRoot) {
    throw new Error(
      "tokenforge.inboxPath is not set. Configure the EM inbox root in workspace settings.",
    );
  }

  const team = teamLabel();
  assertExportableTeam(team);

  const root = resolveWorkspaceRoot();
  const repo = repoLabel(root);
  const destDir = join(inboxRoot, team, repo, LAST_SCAN_DIR);
  await mkdir(destDir, { recursive: true });

  const { lastScanPath, sessionStatsPath } = await writeArtifacts();
  const copied: string[] = [];

  await copyFile(lastScanPath, join(destDir, LAST_SCAN_FILE));
  copied.push(LAST_SCAN_FILE);

  await copyFile(sessionStatsPath, join(destDir, SESSION_STATS_FILE));
  copied.push(SESSION_STATS_FILE);

  return { destDir, copied };
}
