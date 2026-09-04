import { access } from "node:fs/promises";
import { join } from "node:path";
import { commands, Uri, window, workspace } from "vscode";
import { resolveWorkspaceRoot } from "./writeLastScan";

const HONOR_SMOKE_FILE = "honor-smoke.json";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Open honor-smoke checklist or show Soft/Hard paths + CLI hint. */
export async function openHonorSmoke(): Promise<void> {
  const root = resolveWorkspaceRoot();
  const artifactPath = join(root, ".tokenforge", HONOR_SMOKE_FILE);

  if (await exists(artifactPath)) {
    const fileUri = Uri.file(artifactPath);
    await commands.executeCommand("revealInExplorer", fileUri);
    const doc = await workspace.openTextDocument(fileUri);
    await window.showTextDocument(doc, { preview: false });
    return;
  }

  const softPath = join(root, ".cursorindexingignore");
  const hardPath = join(root, ".cursorignore");
  const softExists = await exists(softPath);
  const hardExists = await exists(hardPath);

  const message =
    "No honor-smoke checklist yet. Run `tokenforge honor-smoke .` to generate .tokenforge/honor-smoke.json, " +
    "then verify Cursor honors ignore files on this machine.";
  const detail =
    `Soft (indexing): ${softPath}${softExists ? " ✓" : " (missing)"}\n` +
    `Hard (context): ${hardPath}${hardExists ? " ✓" : " (missing)"}`;

  void window.showInformationMessage(message, { modal: false, detail });
}
