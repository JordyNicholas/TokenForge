import { commands, Uri, window } from "vscode";
import { join } from "node:path";
import { workspace } from "vscode";
import { LAST_SCAN_DIR } from "./writeLastScan";
import { SESSION_STATS_FILE } from "./writeSessionStats";

export function sessionStatsPath(): string | undefined {
  const folder = workspace.workspaceFolders?.[0];
  if (!folder) {
    return undefined;
  }
  return join(folder.uri.fsPath, LAST_SCAN_DIR, SESSION_STATS_FILE);
}

export async function revealSessionStats(reportPath?: string): Promise<void> {
  const path = reportPath ?? sessionStatsPath();
  if (!path) {
    void window.showWarningMessage("Open a folder workspace to reveal session-stats.json.");
    return;
  }
  const uri = Uri.file(path);
  try {
    await commands.executeCommand("revealInExplorer", uri);
  } catch {
    /* explorer reveal can fail in Extension Development Host */
  }
  await window.showTextDocument(uri, { preview: true, preserveFocus: false });
}
