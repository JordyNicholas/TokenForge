import { workspace, type ExtensionContext } from "vscode";
import { isInstructionPath } from "@tokenforge/risk-core";
import type { ShieldSession } from "../session/shieldSession";
import { enrichInstructionPathsCommand } from "../enrich/enrichCommand";

let debounceHandle: ReturnType<typeof setTimeout> | undefined;
let lastSavedPath: string | undefined;
let enrichInFlight = false;
let pendingAfterFlight = false;

/** Debounced Analyze rules on save when tokenforge.continuousAnalyze is enabled. */
export function startContinuousAnalyze(
  session: ShieldSession,
  context: ExtensionContext,
): void {
  const run = (): void => {
    if (enrichInFlight) {
      pendingAfterFlight = true;
      return;
    }
    enrichInFlight = true;
    pendingAfterFlight = false;
    const triggerPath = lastSavedPath;
    void enrichInstructionPathsCommand(session, { triggerPath })
      .catch(() => {
        /* command surfaces its own errors */
      })
      .finally(() => {
        enrichInFlight = false;
        if (pendingAfterFlight) {
          pendingAfterFlight = false;
          run();
        }
      });
  };

  const sub = workspace.onDidSaveTextDocument((doc) => {
    if (!workspace.getConfiguration("tokenforge").get<boolean>("continuousAnalyze", false)) {
      return;
    }
    const folder = workspace.getWorkspaceFolder(doc.uri);
    if (!folder) {
      return;
    }
    const rel = workspace.asRelativePath(doc.uri, false).replaceAll("\\", "/");
    if (!isInstructionPath(rel)) {
      return;
    }
    lastSavedPath = rel;
    if (debounceHandle) {
      clearTimeout(debounceHandle);
    }
    debounceHandle = setTimeout(run, 2_000);
  });

  context.subscriptions.push(sub, {
    dispose: () => {
      if (debounceHandle) {
        clearTimeout(debounceHandle);
      }
    },
  });
}
