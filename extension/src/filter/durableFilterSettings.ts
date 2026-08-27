import { ConfigurationTarget, workspace } from "vscode";

const SETTING_KEY = "durableFilterDecisions";
const SETTING_SECTION = "tokenforge";

/**
 * Durable Filter is **workspace-scoped only** (off by default).
 * User/global settings are ignored — same discipline as auto-filter.
 */
export function isDurableFilterEnabled(): boolean {
  const inspected = workspace
    .getConfiguration(SETTING_SECTION)
    .inspect<boolean>(SETTING_KEY);

  if (inspected?.workspaceFolderValue !== undefined) {
    return inspected.workspaceFolderValue === true;
  }
  if (inspected?.workspaceValue !== undefined) {
    return inspected.workspaceValue === true;
  }
  return false;
}

export async function setDurableFilterDecisions(enabled: boolean): Promise<boolean> {
  if (!workspace.workspaceFolders?.length) {
    return false;
  }
  const config = workspace.getConfiguration(SETTING_SECTION);
  await config.update(SETTING_KEY, enabled, ConfigurationTarget.Workspace);
  return enabled;
}

export async function toggleDurableFilterDecisions(): Promise<boolean> {
  const next = !isDurableFilterEnabled();
  await setDurableFilterDecisions(next);
  return next;
}
