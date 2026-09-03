import type { ExtensionContext } from "vscode";
import type { RiskSession } from "../session/riskSession";
import { isEnrichExportBusy } from "./enrichExportGate";
import { writeLastScan } from "./writeLastScan";
import { writeSessionStats } from "./writeSessionStats";

const DEFAULT_DEBOUNCE_MS = 800;

/**
 * Keep `.tokenforge/last-scan.json` in sync with live Detect state.
 * Debounced so rapid tab/score churn does not spam the filesystem.
 * Heuristic open-tab findings refresh; prior Analyze rules hybrid layers are
 * preserved by writeLastScan when no new enrichment payload is supplied.
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
      if (isEnrichExportBusy()) {
        // Enrichment is writing last-scan; retry after it finishes.
        schedule();
        return;
      }
      void Promise.all([writeLastScan(session), writeSessionStats(session)]).catch(() => {
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
