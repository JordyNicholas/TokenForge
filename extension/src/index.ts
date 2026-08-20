import { commands, window, type ExtensionContext } from "vscode";
import { writeLastScan } from "./export/writeLastScan";
import { TabFilterStore } from "./filter/filterStore";
import { RiskSession } from "./session/riskSession";
import { startInactivityTimer } from "./tabs/inactivityTimer";
import { TabRegistry } from "./tabs/registry";
import { trackTabs } from "./tabs/trackTabs";
import { createRiskPanel, RISK_PANEL_VIEW_ID, type RiskTabItem } from "./ui/riskPanel";
import { createStatusBar } from "./ui/statusBar";

export function activate(context: ExtensionContext): void {
  const registry = new TabRegistry();
  const filters = new TabFilterStore();
  const session = new RiskSession(registry, filters);

  trackTabs(registry, context, {
    onClose: (uri) => filters.clear(uri),
  });
  startInactivityTimer(registry, context);

  createRiskPanel(session, context);
  context.subscriptions.push(createStatusBar(session));
  context.subscriptions.push({ dispose: () => session.dispose() });

  const keep = commands.registerCommand(
    "tokenforge.keepTab",
    (item?: RiskTabItem) => {
      const uri = item?.tab.uri;
      if (!uri) {
        void window.showWarningMessage("Select an at-risk tab in the TokenForge panel.");
        return;
      }
      session.keep(uri);
      void writeLastScan(session).catch((error) => {
        void window.showErrorMessage(formatError("Export failed after Keep", error));
      });
    },
  );

  const filter = commands.registerCommand(
    "tokenforge.filterTab",
    (item?: RiskTabItem) => {
      const uri = item?.tab.uri;
      if (!uri) {
        void window.showWarningMessage("Select an at-risk tab in the TokenForge panel.");
        return;
      }
      session.filter(uri);
      void writeLastScan(session)
        .then((result) => {
          void window.showInformationMessage(
            `Filtered ${item?.tab.path ?? "tab"} — ${result.savedTokens} tokens saved in last-scan.json`,
          );
        })
        .catch((error) => {
          void window.showErrorMessage(formatError("Export failed after Filter", error));
        });
    },
  );

  const exportScan = commands.registerCommand("tokenforge.exportLastScan", async () => {
    try {
      const result = await writeLastScan(session);
      void window.showInformationMessage(
        `Exported ${result.reportPath} (${result.savedTokens} tokens saved)`,
      );
    } catch (error) {
      void window.showErrorMessage(formatError("Export failed", error));
    }
  });

  const focusPanel = commands.registerCommand("tokenforge.focusRiskPanel", async () => {
    await commands.executeCommand(`${RISK_PANEL_VIEW_ID}.focus`);
  });

  context.subscriptions.push(keep, filter, exportScan, focusPanel);
}

export function deactivate(): void {}

function formatError(prefix: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${reason}`;
}
