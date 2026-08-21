import { commands, workspace, window, type ExtensionContext } from "vscode";
import { enrichInstructionPathsCommand } from "./enrich/enrichCommand";
import { startAutoExport } from "./export/autoExport";
import { revealLastScan } from "./export/revealLastScan";
import { writeLastScan } from "./export/writeLastScan";
import { runAutoFilter, toggleAutoFilterHighRisk, isAutoFilterEnabled, setAutoFilterHighRisk } from "./filter/autoFilterSettings";
import { TabFilterStore } from "./filter/filterStore";
import { RiskSession } from "./session/riskSession";
import { startInactivityTimer } from "./tabs/inactivityTimer";
import { TabRegistry } from "./tabs/registry";
import { trackTabs } from "./tabs/trackTabs";
import { createRiskPanel, RISK_PANEL_VIEW_ID, type RiskTabItem } from "./ui/riskPanel";
import { createRiskPulse } from "./ui/riskPulseView";
import { createStatusBar } from "./ui/statusBar";

export function activate(context: ExtensionContext): void {
  const registry = new TabRegistry();
  const filters = new TabFilterStore();
  const session = new RiskSession(registry, filters);

  trackTabs(registry, context, {
    onClose: (uri) => filters.clear(uri),
  });
  startInactivityTimer(registry, context);
  startAutoExport(session, context);

  const syncAutoFilter = (): void => {
    runAutoFilter(session);
  };
  context.subscriptions.push(
    session.onDidChange(syncAutoFilter),
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("tokenforge.autoFilterHighRisk")) {
        syncAutoFilter();
      }
    }),
  );
  syncAutoFilter();
  createRiskPanel(session, context);
  createRiskPulse(session, context);
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
    },
  );

  const filter = commands.registerCommand(
    "tokenforge.filterTab",
    async (item?: RiskTabItem) => {
      const uri = item?.tab.uri;
      if (!uri) {
        void window.showWarningMessage("Select an at-risk tab in the TokenForge panel.");
        return;
      }
      session.filter(uri);
      try {
        const result = await writeLastScan(session);
        const choice = await window.showInformationMessage(
          `Filtered ${item?.tab.path ?? "tab"} — ${result.savedTokens} tokens saved`,
          "Reveal last-scan.json",
        );
        if (choice === "Reveal last-scan.json") {
          await revealLastScan(result.reportPath);
        }
      } catch (error) {
        void window.showErrorMessage(formatError("Export failed after Filter", error));
      }
    },
  );

  const restore = commands.registerCommand(
    "tokenforge.restoreTab",
    (item?: RiskTabItem) => {
      const uri = item?.tab.uri;
      if (!uri) {
        void window.showWarningMessage("Select a filtered tab in the TokenForge panel.");
        return;
      }
      // Keep — not pending — so opt-in auto-filter does not immediately re-filter.
      session.keep(uri);
    },
  );

  const exportScan = commands.registerCommand("tokenforge.exportLastScan", async () => {
    try {
      const result = await writeLastScan(session);
      const choice = await window.showInformationMessage(
        `Exported ${result.reportPath} (${result.savedTokens} tokens saved)`,
        "Reveal",
      );
      if (choice === "Reveal") {
        await revealLastScan(result.reportPath);
      }
    } catch (error) {
      void window.showErrorMessage(formatError("Export failed", error));
    }
  });

  const reveal = commands.registerCommand("tokenforge.revealLastScan", async () => {
    try {
      await writeLastScan(session);
      await revealLastScan();
    } catch (error) {
      void window.showErrorMessage(formatError("Reveal failed", error));
    }
  });

  const refresh = commands.registerCommand("tokenforge.refreshRiskPanel", () => {
    session.refreshScores();
  });

  const clearFilters = commands.registerCommand("tokenforge.clearFilters", () => {
    session.clearAllDecisions();
    void window.showInformationMessage("Cleared Keep/Filter decisions.");
  });

  const toggleAutoFilter = commands.registerCommand(
    "tokenforge.toggleAutoFilterHighRisk",
    async () => {
      const enabled = await toggleAutoFilterHighRisk();
      runAutoFilter(session);
      void window.showInformationMessage(
        enabled
          ? "Auto-filter on — pending lockfile/generated tabs will Filter automatically (this workspace only)."
          : "Auto-filter off — high-risk tabs stay Pending until you Filter.",
      );
    },
  );

  const enableAutoFilter = commands.registerCommand(
    "tokenforge.enableAutoFilterHighRisk",
    async () => {
      if (!isAutoFilterEnabled()) {
        await setAutoFilterHighRisk(true);
        runAutoFilter(session);
        void window.showInformationMessage(
          "Auto-filter on — pending lockfile/generated tabs will Filter automatically (this workspace only).",
        );
      }
    },
  );

  const disableAutoFilter = commands.registerCommand(
    "tokenforge.disableAutoFilterHighRisk",
    async () => {
      if (isAutoFilterEnabled()) {
        await setAutoFilterHighRisk(false);
        runAutoFilter(session);
        void window.showInformationMessage(
          "Auto-filter off — high-risk tabs stay Pending until you Filter.",
        );
      }
    },
  );

  const focusPanel = commands.registerCommand("tokenforge.focusRiskPanel", async () => {
    await commands.executeCommand(`${RISK_PANEL_VIEW_ID}.focus`);
  });

  const enrichInstructions = commands.registerCommand(
    "tokenforge.enrichInstructions",
    async () => {
      try {
        await enrichInstructionPathsCommand(session);
      } catch (error) {
        void window.showErrorMessage(formatError("Instruction enrichment failed", error));
      }
    },
  );

  context.subscriptions.push(
    keep,
    filter,
    restore,
    exportScan,
    reveal,
    refresh,
    clearFilters,
    toggleAutoFilter,
    enableAutoFilter,
    disableAutoFilter,
    focusPanel,
    enrichInstructions,
  );
}

export function deactivate(): void {}

function formatError(prefix: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${reason}`;
}
