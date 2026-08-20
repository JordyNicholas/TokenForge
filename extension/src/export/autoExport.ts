import type { ExtensionContext } from "vscode";
import { writeLastScan } from "./writeLastScan";
import type { RiskSession } from "../session/riskSession";

const DEFAULT_DEBOUNCE_MS = 800;

/**
 * Keep `.tokenforge/last-scan.json` in sync with live Detect state.
 * Debounced so rapid tab/score churn does not spam the filesystem.
 */
export function startAutoExport(
  session: RiskSession,
  context: ExtensionContext,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      void writeLastScan(session).catch(() => {
        /* ignore missing workspace during activate; manual export still surfaces errors */
      });
    }, debounceMs);
  };

  const subscription = session.onDidChange(schedule);
  context.subscriptions.push(subscription, {
    dispose: () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    },
  });

  // Seed an initial report once tabs are tracked.
  schedule();
}
