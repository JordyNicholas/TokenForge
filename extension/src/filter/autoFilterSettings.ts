import { ConfigurationTarget, workspace } from "vscode";
import { applyAutoFilter } from "./autoFilter";
import type { RiskSession } from "../session/riskSession";

const SETTING_KEY = "autoFilterHighRisk";
const SETTING_SECTION = "tokenforge";

export function isAutoFilterEnabled(): boolean {
  return workspace.getConfiguration(SETTING_SECTION).get<boolean>(SETTING_KEY) === true;
}

export function runAutoFilter(session: RiskSession): number {
  return applyAutoFilter(session, isAutoFilterEnabled());
}

/** Flip the setting (workspace if a folder is open, else global) and return the new value. */
export async function toggleAutoFilterHighRisk(): Promise<boolean> {
  const config = workspace.getConfiguration(SETTING_SECTION);
  const next = !isAutoFilterEnabled();
  const target = workspace.workspaceFolders?.length
    ? ConfigurationTarget.Workspace
    : ConfigurationTarget.Global;
  await config.update(SETTING_KEY, next, target);
  return next;
}
