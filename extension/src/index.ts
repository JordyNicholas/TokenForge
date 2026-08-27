import { commands, workspace, window, type ExtensionContext } from "vscode";
import { enrichInstructionPathsCommand } from "./enrich/enrichCommand";
import { startAutoExport } from "./export/autoExport";
import { revealLastScan } from "./export/revealLastScan";
import { revealSessionStats } from "./export/revealSessionStats";
import { writeLastScan, resolveWorkspaceRoot } from "./export/writeLastScan";
import { writeSessionStats } from "./export/writeSessionStats";
import {
  runAutoFilter,
  toggleAutoFilterHighRisk,
  isAutoFilterEnabled,
  setAutoFilterHighRisk,
} from "./filter/autoFilterSettings";
import { DurableFilterPersistence } from "./filter/durableFilterPersistence";
import {
  isDurableFilterEnabled,
  toggleDurableFilterDecisions,
} from "./filter/durableFilterSettings";
import { TabFilterStore } from "./filter/filterStore";
import { RiskSession } from "./session/riskSession";
import { startInactivityTimer } from "./tabs/inactivityTimer";
import { TabRegistry } from "./tabs/registry";
import { trackTabs } from "./tabs/trackTabs";
import { createRiskPanel, RISK_PANEL_VIEW_ID, type RiskTabItem } from "./ui/riskPanel";
import { createRiskPulse } from "./ui/riskPulseView";
import { createStatusBar } from "./ui/statusBar";
import { syncWorkspaceEligibleContext, watchWorkspaceEligibility } from "./workspace/workspaceContext";

export async function activate(context: ExtensionContext): Promise<void> {
  let contextGuardStarted = false;

  const maybeStartContextGuard = async (): Promise<void> => {
    const eligible = await syncWorkspaceEligibleContext();
    if (!eligible || contextGuardStarted) {
      return;
    }
    contextGuardStarted = true;
    startContextGuard(context);
  };

  watchWorkspaceEligibility(context, () => {
    void maybeStartContextGuard();
  });

  await maybeStartContextGuard();
}

function startContextGuard(context: ExtensionContext): void {
  const registry = new TabRegistry();
  const filters = new TabFilterStore();
  const durable = new DurableFilterPersistence();
  const session = new RiskSession(registry, filters, durable);

  try {
    const root = resolveWorkspaceRoot();
    void durable.load(root).then(() => {
      rehydrateDurableDecisions(session, registry, durable);
    });
  } catch {
    /* no folder workspace yet */
  }

  trackTabs(registry, context, {
    onClose: (uri) => {
      if (!isDurableFilterEnabled()) {
        filters.clear(uri);
      }
    },
  });
  startInactivityTimer(registry, context);
  startAutoExport(session, context);

  const syncAutoFilter = (): void => {
    runAutoFilter(session);
  };
  const rehydrate = (): void => {
    rehydrateDurableDecisions(session, registry, durable);
  };
  context.subscriptions.push(
    session.onDidChange(syncAutoFilter),
    registry.onDidChange(rehydrate),
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("tokenforge.autoFilterHighRisk")) {
        syncAutoFilter();
      }
      if (event.affectsConfiguration("tokenforge.durableFilterDecisions")) {
        rehydrate();
      }
    }),
    { dispose: () => durable.dispose() },
  );
  syncAutoFilter();
  rehydrate();
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
        const [result] = await Promise.all([
          writeLastScan(session),
          writeSessionStats(session),
        ]);
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

  const exportSessionStats = commands.registerCommand(
    "tokenforge.exportSessionStats",
    async () => {
      try {
        const result = await writeSessionStats(session);
        const choice = await window.showInformationMessage(
          `Exported ${result.reportPath} (${result.sessionAvoidedTokens} session tokens avoided)`,
          "Reveal",
        );
        if (choice === "Reveal") {
          await revealSessionStats(result.reportPath);
        }
      } catch (error) {
        void window.showErrorMessage(formatError("Session export failed", error));
      }
    },
  );

  const revealSessionStatsCmd = commands.registerCommand(
    "tokenforge.revealSessionStats",
    async () => {
      try {
        await writeSessionStats(session);
        await revealSessionStats();
      } catch (error) {
        void window.showErrorMessage(formatError("Reveal session stats failed", error));
      }
    },
  );

  const toggleDurableFilter = commands.registerCommand(
    "tokenforge.toggleDurableFilterDecisions",
    async () => {
      const enabled = await toggleDurableFilterDecisions();
      rehydrate();
      void window.showInformationMessage(
        enabled
          ? "Durable Filter on — Keep/Filter decisions persist in .tokenforge/ for this workspace."
          : "Durable Filter off — closing a tab clears its decision (current behaviour).",
      );
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
    toggleDurableFilter,
    exportSessionStats,
    revealSessionStatsCmd,
    focusPanel,
    enrichInstructions,
  );
}

function rehydrateDurableDecisions(
  session: RiskSession,
  registry: TabRegistry,
  durable: DurableFilterPersistence,
): void {
  if (!isDurableFilterEnabled()) {
    return;
  }
  for (const tab of registry.list()) {
    if (session.decision(tab.uri) !== "pending") {
      continue;
    }
    const stored = durable.get(tab.path);
    if (stored) {
      session.rehydrate(tab.uri, stored);
    }
  }
}

export function deactivate(): void {}

function formatError(prefix: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${reason}`;
}
