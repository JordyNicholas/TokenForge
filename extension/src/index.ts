import {
  commands,
  ConfigurationTarget,
  env,
  QuickPickItem,
  workspace,
  window,
  type ExtensionContext,
} from "vscode";
import { runPrePromptGate } from "./ai/prePromptGate";
import { buildTaskContextPack } from "./ai/taskContextPack";
import { discoverRecentChanges } from "./discover/discoverService";
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
import { closeTabByUri } from "./shield/closeTab";
import { createShieldSession, type ShieldSession } from "./session/shieldSession";
import { startInactivityTimer } from "./tabs/inactivityTimer";
import { TabRegistry } from "./tabs/registry";
import { trackTabs } from "./tabs/trackTabs";
import {
  createRiskPanel,
  RISK_PANEL_VIEW_ID,
  toggleCloseTabOnHardShieldSetting,
  toggleNotifyOnIdleSetting,
  type RiskTabItem,
} from "./ui/riskPanel";
import { createRiskPulse, RISK_PULSE_VIEW_ID } from "./ui/riskPulseView";
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
  const session = createShieldSession(registry, filters, durable);

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

  maybeShowWelcome(context);

  const shieldTabHandler = async (item?: RiskTabItem): Promise<void> => {
    const uri = item?.tab.uri;
    if (!uri) {
      void window.showWarningMessage("Select a tab in Open tabs.");
      return;
    }
    await performShield(session, uri, item?.tab.path);
  };

  const keep = commands.registerCommand("tokenforge.keepTab", async (item?: RiskTabItem) => {
    const uri = item?.tab.uri;
    if (!uri) {
      void window.showWarningMessage("Select a tab in Open tabs.");
      return;
    }
    await session.allow(uri);
  });

  const filter = commands.registerCommand("tokenforge.filterTab", shieldTabHandler);
  const shieldTab = commands.registerCommand("tokenforge.shieldTab", shieldTabHandler);

  const restore = commands.registerCommand(
    "tokenforge.restoreTab",
    async (item?: RiskTabItem) => {
      const uri = item?.tab.uri;
      if (!uri) {
        void window.showWarningMessage("Select a Shielded tab in Open tabs.");
        return;
      }
      await session.unshield(uri);
    },
  );

  const shieldAllPending = commands.registerCommand(
    "tokenforge.shieldAllPending",
    async () => {
      const count = await session.shieldAllPending("hard");
      if (count === 0) {
        void window.showInformationMessage("No pending tabs to Shield.");
        return;
      }
      void window.showInformationMessage(`Shielded ${count} pending tab(s).`);
      await exportAfterShield(session);
    },
  );

  const cleanSession = commands.registerCommand("tokenforge.cleanSession", async () => {
    const shielded = session.listFilteredAtRisk();
    for (const tab of shielded) {
      await session.unshield(tab.uri);
    }
    session.clearAllDecisions();
    session.shieldMeta.clearAll();
    void window.showInformationMessage("Clean session — all Shield choices reset.");
  });

  const prepareAgentSession = commands.registerCommand(
    "tokenforge.prepareAgentSession",
    async () => {
      const ok = await runPrePromptGate(session);
      if (!ok) {
        return;
      }
      const pack = buildTaskContextPack(session);
      void window.showInformationMessage(
        `Task pack: ${pack.paths.length} path(s), ~${pack.estTokens} tokens. ${pack.note}`,
      );
    },
  );

  const runDiscover = commands.registerCommand("tokenforge.runDiscover", async () => {
    try {
      const root = resolveWorkspaceRoot();
      const hours = workspace
        .getConfiguration("tokenforge")
        .get<number>("discoverIntervalHours", 24);
      const candidates = await discoverRecentChanges(root, {
        sinceMs: hours * 60 * 60 * 1000,
      });
      if (candidates.length === 0) {
        void window.showInformationMessage("Discover found no recent changes.");
        return;
      }
      const top = candidates
        .slice(0, 5)
        .map((c) => c.path)
        .join(", ");
      void window.showInformationMessage(`Discover: ${top}`);
    } catch (error) {
      void window.showErrorMessage(formatError("Discover failed", error));
    }
  });

  const copySmartExcerpt = commands.registerCommand(
    "tokenforge.copySmartExcerpt",
    async () => {
      const tab = session.listDisplayAtRisk()[0];
      if (!tab) {
        void window.showWarningMessage("No context-cost tabs to excerpt.");
        return;
      }
      await env.clipboard.writeText(tab.path);
      void window.showInformationMessage(`Copied path excerpt: ${tab.path}`);
    },
  );

  const compactRulesPreview = commands.registerCommand(
    "tokenforge.compactRulesPreview",
    async () => {
      void window.showInformationMessage(
        "Compact rules preview — coming in F11. Run Analyze rules for now.",
      );
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
    session.shieldMeta.clearAll();
    void window.showInformationMessage("Reset choices — Allow/Shield decisions cleared.");
  });

  const toggleAutoFilter = commands.registerCommand(
    "tokenforge.toggleAutoFilterHighRisk",
    async () => {
      const enabled = await toggleAutoFilterHighRisk();
      runAutoFilter(session);
      void window.showInformationMessage(
        enabled
          ? "Auto-shield on — pending lockfile/generated tabs Shield automatically (this workspace only)."
          : "Auto-shield off — high-risk tabs stay Needs review until you Shield.",
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
          "Auto-shield on — pending lockfile/generated tabs Shield automatically (this workspace only).",
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
          "Auto-shield off — high-risk tabs stay Needs review until you Shield.",
        );
      }
    },
  );

  const focusPanel = commands.registerCommand("tokenforge.focusRiskPanel", async () => {
    await commands.executeCommand(`${RISK_PANEL_VIEW_ID}.focus`);
  });

  const focusOverview = commands.registerCommand("tokenforge.focusOverview", async () => {
    await commands.executeCommand(`${RISK_PULSE_VIEW_ID}.focus`);
  });

  const moreActions = commands.registerCommand("tokenforge.moreActions", async () => {
    const items: QuickPickItem[] = [
      { label: "Refresh scores", description: "Rescore open tabs" },
      { label: "Export last-scan.json" },
      { label: "Reveal last-scan.json" },
      { label: "Reveal session-stats.json" },
      { label: "Reset choices" },
      { label: "Analyze rules" },
      { label: "Clean session" },
      { label: "Prepare agent session" },
      { label: "Run discover" },
      { label: "Copy smart excerpt" },
      { label: "Compact rules preview" },
      { label: "Focus Open tabs" },
    ];
    const picked = await window.showQuickPick(items, { title: "TokenForge actions" });
    if (!picked) {
      return;
    }
    const commandMap: Record<string, string> = {
      "Refresh scores": "tokenforge.refreshRiskPanel",
      "Export last-scan.json": "tokenforge.exportLastScan",
      "Reveal last-scan.json": "tokenforge.revealLastScan",
      "Reveal session-stats.json": "tokenforge.revealSessionStats",
      "Reset choices": "tokenforge.clearFilters",
      "Analyze rules": "tokenforge.enrichInstructions",
      "Clean session": "tokenforge.cleanSession",
      "Prepare agent session": "tokenforge.prepareAgentSession",
      "Run discover": "tokenforge.runDiscover",
      "Copy smart excerpt": "tokenforge.copySmartExcerpt",
      "Compact rules preview": "tokenforge.compactRulesPreview",
      "Focus Open tabs": "tokenforge.focusRiskPanel",
    };
    const cmd = commandMap[picked.label];
    if (cmd) {
      await commands.executeCommand(cmd);
    }
  });

  const enrichInstructions = commands.registerCommand(
    "tokenforge.enrichInstructions",
    async () => {
      try {
        await enrichInstructionPathsCommand(session);
      } catch (error) {
        void window.showErrorMessage(formatError("Analyze rules failed", error));
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
          ? "Durable choices on — Allow/Shield persist in .tokenforge/ for this workspace."
          : "Durable choices off — closing a tab clears its decision.",
      );
    },
  );

  const toggleCloseOnHard = commands.registerCommand(
    "tokenforge.toggleCloseTabOnHardShield",
    async () => {
      const enabled = await toggleCloseTabOnHardShieldSetting();
      void window.showInformationMessage(
        enabled
          ? "Close tab on hard Shield — ON."
          : "Close tab on hard Shield — OFF.",
      );
    },
  );

  const toggleNotifyIdle = commands.registerCommand(
    "tokenforge.toggleNotifyOnIdle",
    async () => {
      const enabled = await toggleNotifyOnIdleSetting();
      void window.showInformationMessage(
        enabled ? "Notify on idle — ON." : "Notify on idle — OFF.",
      );
    },
  );

  context.subscriptions.push(
    keep,
    filter,
    shieldTab,
    restore,
    shieldAllPending,
    cleanSession,
    prepareAgentSession,
    runDiscover,
    copySmartExcerpt,
    compactRulesPreview,
    exportScan,
    reveal,
    refresh,
    clearFilters,
    toggleAutoFilter,
    enableAutoFilter,
    disableAutoFilter,
    toggleDurableFilter,
    toggleCloseOnHard,
    toggleNotifyIdle,
    exportSessionStats,
    revealSessionStatsCmd,
    focusPanel,
    focusOverview,
    moreActions,
    enrichInstructions,
  );
}

async function performShield(
  session: ShieldSession,
  uri: string,
  pathLabel?: string,
): Promise<void> {
  const closeOnHard = workspace
    .getConfiguration("tokenforge")
    .get<boolean>("closeTabOnHardShield", false);
  const result = await session.shield(uri, { mode: "hard" });
  if (closeOnHard && result?.mode === "hard") {
    await closeTabByUri(uri);
  }
  try {
    const [exportResult] = await Promise.all([
      writeLastScan(session),
      writeSessionStats(session),
    ]);
    const choice = await window.showInformationMessage(
      `Shielded ${pathLabel ?? "tab"} — ${exportResult.savedTokens} tokens saved`,
      "Reveal last-scan.json",
    );
    if (choice === "Reveal last-scan.json") {
      await revealLastScan(exportResult.reportPath);
    }
  } catch (error) {
    void window.showErrorMessage(formatError("Export failed after Shield", error));
  }
}

async function exportAfterShield(session: ShieldSession): Promise<void> {
  try {
    await Promise.all([writeLastScan(session), writeSessionStats(session)]);
  } catch {
    /* best effort */
  }
}

function rehydrateDurableDecisions(
  session: ShieldSession,
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

function maybeShowWelcome(context: ExtensionContext): void {
  const show = workspace.getConfiguration("tokenforge").get<boolean>("showWelcome", true);
  if (!show) {
    return;
  }
  const key = "tokenforge.welcomeShown";
  if (context.globalState.get<boolean>(key)) {
    return;
  }
  void context.globalState.update(key, true);
  void commands.executeCommand("workbench.action.openWalkthrough", "tokenforge.welcome");
}

export function deactivate(): void {}

function formatError(prefix: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${reason}`;
}
