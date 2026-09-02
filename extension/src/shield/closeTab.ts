import { Uri, window } from "vscode";

/** Close the first editor tab matching `uri`, if open. */
export async function closeTabByUri(uri: string): Promise<boolean> {
  for (const group of window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      if (!input || typeof input !== "object" || !("uri" in input)) {
        continue;
      }
      const tabUri = (input as { uri: Uri }).uri;
      if (tabUri.toString() === uri) {
        await window.tabGroups.close(tab);
        return true;
      }
    }
  }
  return false;
}
