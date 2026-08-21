import { ConfigurationTarget, workspace } from "vscode";
import { applyAutoFilter } from "./autoFilter";
import type { RiskSession } from "../session/riskSession";

const SETTING_KEY = "autoFilterHighRisk";
const SETTING_SECTION = "tokenforge";

/**
 * Auto-filter is **workspace-scoped only** (off by default).
 * User/global settings are ignored so one repo cannot enable it for all.
 */
export function isAutoFilterEnabled(): boolean {
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

export function runAutoFilter(session: RiskSession): number {
  return applyAutoFilter(session, isAutoFilterEnabled());
}

/** Persist auto-filter for the current workspace folder only. */
export async function setAutoFilterHighRisk(enabled: boolean): Promise<boolean> {
  if (!workspace.workspaceFolders?.length) {
    return false;
  }
  const config = workspace.getConfiguration(SETTING_SECTION);
  await config.update(SETTING_KEY, enabled, ConfigurationTarget.Workspace);
  return enabled;
}

/** Flip the workspace setting and return the new value. */
export async function toggleAutoFilterHighRisk(): Promise<boolean> {
  const next = !isAutoFilterEnabled();
  await setAutoFilterHighRisk(next);
  return next;
}
