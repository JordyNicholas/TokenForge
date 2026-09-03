import { ConfigurationTarget, workspace } from "vscode";
import { applyAutoShield, type AutoShieldSession } from "./autoFilter";

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

let inFlight: Promise<void> | null = null;
let rerunRequested = false;

/**
 * Reactive auto-shield with single-flight coalescing. Shield is async and
 * writes provider files, and each Shield fires `onDidChange` (which re-triggers
 * this), so overlapping runs would otherwise double-apply a tab before its
 * decision flips to Shielded. Runs are serialized and bursts are collapsed into
 * one trailing re-run.
 */
export function runAutoShield(session: AutoShieldSession): void {
  if (inFlight) {
    rerunRequested = true;
    return;
  }
  inFlight = applyAutoShield(session, isAutoFilterEnabled())
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      inFlight = null;
      if (rerunRequested) {
        rerunRequested = false;
        runAutoShield(session);
      }
    });
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
