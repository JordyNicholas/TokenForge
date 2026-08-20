import { commands, Uri, window } from "vscode";
import { join } from "node:path";
import { workspace } from "vscode";
import { LAST_SCAN_DIR, LAST_SCAN_FILE } from "./writeLastScan";

export function lastScanPath(): string | undefined {
  const folder = workspace.workspaceFolders?.[0];
  if (!folder) {
    return undefined;
  }
  return join(folder.uri.fsPath, LAST_SCAN_DIR, LAST_SCAN_FILE);
}

/** Reveal `.tokenforge/last-scan.json` in the explorer (and open it). */
export async function revealLastScan(reportPath?: string): Promise<void> {
  const path = reportPath ?? lastScanPath();
  if (!path) {
    void window.showWarningMessage("Open a folder workspace to reveal last-scan.json.");
    return;
  }
  const uri = Uri.file(path);
  try {
    await commands.executeCommand("revealInExplorer", uri);
  } catch {
    /* explorer reveal can fail in Extension Development Host — still open the file */
  }
  await window.showTextDocument(uri, { preview: true, preserveFocus: false });
}
