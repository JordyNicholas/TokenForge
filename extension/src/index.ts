import {
  commands,
  ProgressLocation,
  QuickPickItem,
  workspace,
  window,
  type ExtensionContext,
} from "vscode";
import { applyTaskContextPack } from "./ai/applyTaskPack";
import { runPrepareAgentSession } from "./ai/prepareSession";
import { copySmartExcerpt } from "./ai/smartExcerpt";
import { discoverRecentChanges } from "./discover/discoverService";
import { enrichInstructionPathsCommand } from "./enrich/enrichCommand";
import {
  enableLlmEnrichmentWithLocalDefault,
  setLlmEnrichmentEnabled,
} from "./enrich/settings";
import { startAutoExport } from "./export/autoExport";
import { assertValidLastScan, buildLastScanReport } from "./export/buildLastScan";
import { revealLastScan } from "./export/revealLastScan";
import { revealSessionStats } from "./export/revealSessionStats";
import {
  repoLabel,
  teamLabel,
  writeLastScan,
  resolveWorkspaceRoot,
} from "./export/writeLastScan";
import { writeSessionStats } from "./export/writeSessionStats";
import type { ProviderId } from "@tokenforge/risk-core";
import {
  runAutoShield,
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
import { installCursorShieldHooks } from "./hooks/cursorHooks";
import {
  applyCompactRules,
  previewCompactRules,
  resolveCompactReport,
  showCompactRulesPreviewMessage,
} from "./instructions/compactRules";
import { startContinuousAnalyze } from "./instructions/continuousAnalyze";
import { closeTabByUri } from "./shield/closeTab";
import { createShieldSession, type ShieldSession } from "./session/shieldSession";
import { startIdleNudges } from "./tabs/idleNudges";
import { startInactivityTimer } from "./tabs/inactivityTimer";
import { TabRegistry } from "./tabs/registry";
import { trackTabs } from "./tabs/trackTabs";
import { trackCustomEditorTabs } from "./tabs/customEditorTabs";
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
  trackCustomEditorTabs(registry, context);
  startInactivityTimer(registry, context);
  startIdleNudges(registry, context);
  startContinuousAnalyze(session, context);
  startAutoExport(session, context);
  void maybeInstallCursorHooks();

  const syncAutoFilter = (): void => {
    runAutoShield(session);
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
      const exported = await exportAfterShield(session);
      if (!exported) {
        void window.showWarningMessage(
          "Shield applied, but exporting last-scan.json / session-stats failed.",
        );
      }
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
      try {
        const result = await runPrepareAgentSession(session);
        if (result.applied) {
          await exportAfterShield(session);
        }
      } catch (error) {
        void window.showErrorMessage(formatError("Prepare session failed", error));
      }
    },
  );

  const runDiscover = commands.registerCommand("tokenforge.runDiscover", async () => {
    try {
      const root = resolveWorkspaceRoot();
      const hours = workspace
        .getConfiguration("tokenforge")
        .get<number>("discoverIntervalHours", 24);
      const editorPath = window.activeTextEditor
        ? workspace.asRelativePath(window.activeTextEditor.document.uri, false).replaceAll("\\", "/")
        : undefined;
      const report = assertValidLastScan(
        buildLastScanReport({
          tabs: session.listAll(),
          decisionFor: (uri) => session.decision(uri),
          repo: repoLabel(root),
          team: teamLabel(),
          provider: providerIdFromSettings(),
        }),
      );
      const { candidates, ranking } = await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: "TokenForge: Run discover",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: "Scanning missed savings and recent changes…" });
          return discoverRecentChanges(root, {
            sinceMs: hours * 60 * 60 * 1000,
            editorPath,
            report,
            provider: providerIdFromSettings(),
            writeReport: true,
            onProgress: (message) => progress.report({ message }),
          });
        },
      );
      if (candidates.length === 0) {
        void window.showInformationMessage("Discover found no missed savings or recent changes.");
        return;
      }
      const top = candidates
        .slice(0, 5)
        .map((c) => `${c.path}${c.kind ? ` [${c.kind}]` : ""}`)
        .join(", ");
      const rankNote =
        ranking === "heuristic"
          ? " Ranked heuristically (LLM unavailable)."
          : ranking === "llm"
            ? " Ranked with AI enrichment."
            : "";
      void window.showInformationMessage(`Discover: ${top}.${rankNote}`);
    } catch (error) {
      void window.showErrorMessage(formatError("Discover failed", error));
    }
  });

  const copySmartExcerptCmd = commands.registerCommand(
    "tokenforge.copySmartExcerpt",
    async () => {
      await copySmartExcerpt();
    },
  );

  const applyTaskContextPackCmd = commands.registerCommand(
    "tokenforge.applyTaskContextPack",
    async () => {
      const count = await applyTaskContextPack(session);
      if (count === 0) {
        void window.showInformationMessage("No pending tabs to adjust for task pack.");
        return;
      }
      void window.showInformationMessage(`Applied task context pack to ${count} tab(s).`);
      await exportAfterShield(session);
    },
  );

  const compactRulesPreview = commands.registerCommand(
    "tokenforge.compactRulesPreview",
    async () => {
      try {
        const root = resolveWorkspaceRoot();
        const sessionReport = assertValidLastScan(
          buildLastScanReport({
            tabs: session.listAll(),
            decisionFor: (uri) => session.decision(uri),
            repo: repoLabel(root),
            team: teamLabel(),
            provider: providerIdFromSettings(),
          }),
        );
        const report = await resolveCompactReport(root, sessionReport);
        const preview = await previewCompactRules(root, report);
        if (preview.resolved.length === 0) {
          void window.showInformationMessage(
            "No compact rules changes suggested. Run Analyze rules first.",
          );
          return;
        }
        const apply = await showCompactRulesPreviewMessage(preview);
        if (!apply) {
          return;
        }
        const written = await applyCompactRules(root, preview);
        void window.showInformationMessage(
          `Compact rules applied to ${written.length} file(s): ${written.join(", ")}`,
        );
      } catch (error) {
        void window.showErrorMessage(formatError("Compact rules failed", error));
      }
    },
  );

  const exportScan = commands.registerCommand("tokenforge.exportLastScan", async () => {
    try {
      const result = await writeLastScan(session);
      const summary = result.wrote
        ? `Exported ${result.reportPath} (${result.savedTokens} tokens saved)`
        : `last-scan.json already up to date (${result.savedTokens} tokens saved)`;
      const choice = await window.showInformationMessage(summary, "Reveal");
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
      runAutoShield(session);
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
        runAutoShield(session);
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
        runAutoShield(session);
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
      { label: "Analyze rules", description: "AI: enrich instruction files" },
      { label: "Toggle AI enrichment", description: "Turn Lane A LLM on/off" },
      { label: "Clean session" },
      { label: "Prepare agent session" },
      { label: "Run discover" },
      { label: "Copy smart excerpt" },
      { label: "Compact rules preview" },
      { label: "Apply task pack" },
      { label: "Focus Open tabs" },
    ];
    const picked = await window.showQuickPick(items, {
      title: "All TokenForge actions",
    });
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
      "Toggle AI enrichment": "tokenforge.toggleLlmEnrichment",
      "Clean session": "tokenforge.cleanSession",
      "Prepare agent session": "tokenforge.prepareAgentSession",
      "Run discover": "tokenforge.runDiscover",
      "Copy smart excerpt": "tokenforge.copySmartExcerpt",
      "Compact rules preview": "tokenforge.compactRulesPreview",
      "Apply task pack": "tokenforge.applyTaskContextPack",
      "Focus Open tabs": "tokenforge.focusRiskPanel",
    };
    const cmd = commandMap[picked.label];
    if (cmd) {
      await commands.executeCommand(cmd);
    }
  });

  const toggleLlmEnrich = commands.registerCommand(
    "tokenforge.toggleLlmEnrichment",
    async () => {
      if (!workspace.workspaceFolders?.length) {
        void window.showWarningMessage(
          "Open a folder to toggle TokenForge AI enrichment (workspace-scoped).",
        );
        return;
      }
      const currentlyOn =
        workspace.getConfiguration("tokenforge").get<boolean>("llmEnrichment") === true;
      if (currentlyOn) {
        await setLlmEnrichmentEnabled(false);
        void window.showInformationMessage(
          "TokenForge AI enrichment OFF — Detect stays heuristic; Analyze rules is disabled.",
        );
        return;
      }
      const { seededModel } = await enableLlmEnrichmentWithLocalDefault();
      void window.showInformationMessage(
        seededModel
          ? `TokenForge AI enrichment ON — using local ${seededModel} (Ollama). Detect stays heuristic.`
          : "TokenForge AI enrichment ON — Analyze rules will use your configured model. Detect stays heuristic.",
      );
    },
  );

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
        const summary = result.wrote
          ? `Exported ${result.reportPath} (${result.sessionAvoidedTokens} session tokens avoided)`
          : `session-stats.json already up to date (${result.sessionAvoidedTokens} session tokens avoided)`;
        const choice = await window.showInformationMessage(summary, "Reveal");
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
    copySmartExcerptCmd,
    applyTaskContextPackCmd,
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
    toggleLlmEnrich,
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
      `Shielded ${pathLabel ?? "tab"} — session estimate ${exportResult.savedTokens} tokens saved`,
      "Reveal last-scan.json",
    );
    if (choice === "Reveal last-scan.json") {
      await revealLastScan(exportResult.reportPath);
    }
  } catch (error) {
    void window.showErrorMessage(formatError("Export failed after Shield", error));
  }
}

async function exportAfterShield(session: ShieldSession): Promise<boolean> {
  try {
    await Promise.all([writeLastScan(session), writeSessionStats(session)]);
    return true;
  } catch {
    return false;
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

async function maybeInstallCursorHooks(): Promise<void> {
  const enabled = workspace
    .getConfiguration("tokenforge")
    .get<boolean>("installCursorHooks", false);
  if (!enabled) {
    return;
  }
  try {
    const root = resolveWorkspaceRoot();
    await installCursorShieldHooks(root);
  } catch {
    /* no workspace */
  }
}

function providerIdFromSettings(): ProviderId {
  const value = workspace.getConfiguration("tokenforge").get<string>("provider");
  if (
    value === "copilot" ||
    value === "cursor" ||
    value === "claude" ||
    value === "gemini" ||
    value === "generic"
  ) {
    return value;
  }
  return "generic";
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
  // VS Code expects publisher.extensionId#walkthroughId
  const walkthroughId = "tokenforge.tokenforge-context-guard#tokenforge.welcome";
  void commands
    .executeCommand("workbench.action.openWalkthrough", walkthroughId)
    .then(
      () => context.globalState.update(key, true),
      () => {
        /* leave welcomeShown unset so a later activate can retry */
      },
    );
}

export function deactivate(): void {}

function formatError(prefix: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${reason}`;
}
