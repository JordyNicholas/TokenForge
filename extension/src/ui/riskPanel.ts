import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
  type Event,
  type ExtensionContext,
  type TreeDataProvider,
  type TreeView,
} from "vscode";
import type { EffectivenessTier, ShieldMode } from "@tokenforge/context-adapters";
import { primaryReason } from "@tokenforge/risk-core";
import { isAutoFilterEnabled } from "../filter/autoFilterSettings";
import {
  isDurableFilterEnabled,
  toggleDurableFilterDecisions,
} from "../filter/durableFilterSettings";
import type { TabDecision } from "../filter/types";
import type { ShieldSession } from "../session/shieldSession";
import type { SessionLedgerEntry } from "../session/sessionLedger";
import { idleHintForTab } from "../tabs/idleHint";
import type { TrackedTab } from "../tabs/types";
import {
  effectivenessTooltip,
  formatShieldBadge,
  rollupShieldEffectiveness,
} from "../shield/effectivenessLabels";
import { formatTokenCount } from "./formatTokens";
import { startUiTicker } from "./uiTicker";

export const RISK_PANEL_VIEW_ID = "tokenforge.riskPanel";

type SectionId = "pending" | "kept" | "filtered" | "approaching" | "history";

function isCloseTabOnHardShieldEnabled(): boolean {
  return workspace.getConfiguration("tokenforge").get<boolean>("closeTabOnHardShield", false);
}

function isNotifyOnIdleEnabled(): boolean {
  return workspace.getConfiguration("tokenforge").get<boolean>("notifyOnIdle", false);
}

abstract class ShieldSettingItem extends TreeItem {
  constructor(label: string, enabled: boolean, tooltipOn: string, tooltipOff: string) {
    super(label, TreeItemCollapsibleState.None);
    this.description = enabled ? "On" : "Off";
    this.tooltip = enabled ? tooltipOn : tooltipOff;
    this.iconPath = new ThemeIcon(enabled ? "check" : "circle-outline");
  }
}

export class ShieldAutoFilterItem extends ShieldSettingItem {
  constructor(enabled: boolean) {
    super(
      "Auto-shield lockfiles",
      enabled,
      "Auto-shield ON — pending lockfile/generated tabs Shield automatically. Click to turn off.",
      "Auto-shield OFF. Click to Shield pending lockfile and generated tabs automatically.",
    );
    this.contextValue = enabled ? "tokenforge.autoFilterOn" : "tokenforge.autoFilterOff";
    this.command = {
      command: "tokenforge.toggleAutoFilterHighRisk",
      title: "Auto-shield lockfiles",
    };
  }
}

export class ShieldCloseOnHardItem extends ShieldSettingItem {
  constructor(enabled: boolean) {
    super(
      "Close tab on hard Shield",
      enabled,
      "Hard Shield closes the editor tab after applying levers. Click to turn off.",
      "Hard Shield keeps tabs open. Click to close tabs after hard Shield.",
    );
    this.contextValue = "tokenforge.closeOnHardSetting";
    this.command = {
      command: "tokenforge.toggleCloseTabOnHardShield",
      title: "Toggle close tab on hard Shield",
    };
  }
}

export class ShieldDurableItem extends ShieldSettingItem {
  constructor(enabled: boolean) {
    super(
      "Durable choices",
      enabled,
      "Allow/Shield choices persist in .tokenforge/ for this workspace. Click to turn off.",
      "Choices reset when tabs close. Click to persist Allow/Shield in .tokenforge/.",
    );
    this.contextValue = "tokenforge.durableSetting";
    this.command = {
      command: "tokenforge.toggleDurableFilterDecisions",
      title: "Toggle durable choices",
    };
  }
}

export class ShieldNotifyIdleItem extends ShieldSettingItem {
  constructor(enabled: boolean) {
    super(
      "Notify on idle",
      enabled,
      "Idle threshold notifications are ON. Click to turn off.",
      "Idle threshold notifications are OFF. Click to enable nudges.",
    );
    this.contextValue = "tokenforge.notifyIdleSetting";
    this.command = {
      command: "tokenforge.toggleNotifyOnIdle",
      title: "Toggle notify on idle",
    };
  }
}

export class ShieldSectionItem extends TreeItem {
  constructor(
    readonly sectionId: SectionId,
    label: string,
    count: number,
  ) {
    super(
      label,
      count > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed,
    );
    this.contextValue = `tokenforge.section.${sectionId}`;
    this.description = count > 0 ? String(count) : undefined;
    this.iconPath = new ThemeIcon(
      sectionId === "pending"
        ? "warning"
        : sectionId === "kept"
          ? "pinned"
          : sectionId === "filtered"
            ? "shield"
            : sectionId === "history"
              ? "history"
              : "clock",
    );
  }
}

export class ShieldActivePathsItem extends TreeItem {
  constructor(openTabCount: number) {
    super("Protected from Fix exclude", TreeItemCollapsibleState.None);
    this.description = openTabCount > 0 ? `${openTabCount} open tab(s)` : "none";
    this.tooltip = [
      "Every open editor tab is listed in last-scan.json activePaths.",
      "tokenforge apply never suggests excluding paths you have open — including idle tabs.",
      "Idle tabs still count as active session context for Fix safety.",
      "",
      "Recommendations only — TokenForge does not intercept any agent pipeline.",
    ].join("\n");
    this.iconPath = new ThemeIcon("lock");
    this.contextValue = "tokenforge.activePaths";
  }
}

export class ShieldEffectivenessItem extends TreeItem {
  constructor(rollup: {
    label: string;
    count: number;
    mode: ShieldMode;
    effectiveness: EffectivenessTier;
  }) {
    super(rollup.label, TreeItemCollapsibleState.None);
    this.description = `${rollup.count} tab(s) this session`;
    this.tooltip = effectivenessTooltip(rollup.mode, rollup.effectiveness);
    this.iconPath = new ThemeIcon(
      rollup.effectiveness === "full"
        ? "verified"
        : rollup.effectiveness === "partial"
          ? "shield"
          : "info",
    );
    this.contextValue = "tokenforge.effectivenessBadge";
  }
}

export class ShieldSummaryItem extends TreeItem {
  constructor(
    contextCost: number,
    savedTokens: number,
    beforeTokens: number,
    sessionAvoidedTokens: number,
  ) {
    super("Context cost", TreeItemCollapsibleState.None);
    const liveSaved =
      savedTokens > 0 ? ` · ${formatTokenCount(savedTokens)} shielded` : "";
    const sessionSaved =
      sessionAvoidedTokens > 0
        ? ` · ${formatTokenCount(sessionAvoidedTokens)} session saved`
        : "";
    this.description = `${formatTokenCount(contextCost)} open${liveSaved}${sessionSaved}`;
    this.tooltip = [
      `Open-tab estimate: ${beforeTokens} tokens`,
      `Context cost (needs review + allowed): ${contextCost} tokens`,
      savedTokens > 0
        ? `Shielded from estimate (open tabs): ${savedTokens} tokens`
        : "Shield a tab to record savings in last-scan.json",
      sessionAvoidedTokens > 0
        ? `Session saved (this window): ${sessionAvoidedTokens} tokens`
        : undefined,
      "",
      "Recommendations only — TokenForge does not intercept any agent pipeline.",
    ]
      .filter(Boolean)
      .join("\n");
    this.iconPath = new ThemeIcon("dashboard");
    this.contextValue = "tokenforge.summary";
  }
}

export class ShieldEmptyItem extends TreeItem {
  constructor() {
    super("No tabs need review", TreeItemCollapsibleState.None);
    this.description = "Open noisy files or wait for idle (10m focused / 5m background)";
    this.tooltip =
      "TokenForge scores open editors for inactive / high-risk context. Hygiene advice, not interception.";
    this.iconPath = new ThemeIcon("pass");
    this.contextValue = "tokenforge.empty";
  }
}

export class RiskTabItem extends TreeItem {
  constructor(
    readonly tab: TrackedTab,
    readonly decision: Exclude<TabDecision, "filtered"> | "filtered" | "approaching",
    session: ShieldSession,
    nowMs: number = Date.now(),
    options: { background?: boolean } = {},
  ) {
    super(tab.path, TreeItemCollapsibleState.None);
    const reason = primaryReason(tab.assessment.reasons);
    const background = options.background ?? false;
    const hint = idleHintForTab(tab, nowMs, { background });
    const lever = session.leverRecord(tab.uri);
    const leverBits =
      lever !== undefined
        ? [formatShieldBadge(lever.mode, lever.effectiveness)]
        : [];
    const bits = [
      formatTokenCount(tab.assessment.estTokens),
      reason,
      hint?.label,
      ...leverBits,
    ].filter(Boolean);
    this.description = bits.join(" · ");
    this.tooltip = [
      tab.path,
      `${tab.assessment.estTokens} est. tokens · score ${tab.assessment.score}`,
      hint ? hint.label : undefined,
      lever ? effectivenessTooltip(lever.mode, lever.effectiveness) : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    if (decision === "filtered") {
      this.contextValue = "tokenforge.filteredTab";
      this.iconPath = new ThemeIcon("shield");
    } else if (decision === "kept") {
      this.contextValue = "tokenforge.keptTab";
      this.iconPath = new ThemeIcon("pinned");
    } else if (decision === "approaching") {
      this.contextValue = "tokenforge.approachingTab";
      this.iconPath = new ThemeIcon("clock");
    } else {
      this.contextValue = "tokenforge.atRiskTab";
      this.iconPath = new ThemeIcon("warning");
    }
    this.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [Uri.parse(tab.uri)],
    };
  }
}

export class ShieldHistoryItem extends TreeItem {
  constructor(readonly entry: SessionLedgerEntry) {
    super(entry.path, TreeItemCollapsibleState.None);
    this.description = [formatTokenCount(entry.estTokens), entry.reason]
      .filter(Boolean)
      .join(" · ");
    this.tooltip = [
      entry.path,
      `${entry.estTokens} est. tokens · ${entry.reason}`,
      "Shielded this session — remains after tab close until Unshield or Reset choices.",
    ].join("\n");
    this.iconPath = new ThemeIcon("shield");
    this.contextValue = "tokenforge.historyTab";
    this.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [Uri.parse(entry.uri)],
    };
  }
}

export type RiskTreeNode =
  | ShieldAutoFilterItem
  | ShieldCloseOnHardItem
  | ShieldDurableItem
  | ShieldNotifyIdleItem
  | ShieldActivePathsItem
  | ShieldEffectivenessItem
  | ShieldSummaryItem
  | ShieldSectionItem
  | RiskTabItem
  | ShieldHistoryItem
  | ShieldEmptyItem;

class RiskPanelProvider implements TreeDataProvider<RiskTreeNode> {
  private readonly _onDidChangeTreeData = new EventEmitter<RiskTreeNode | undefined | void>();
  readonly onDidChangeTreeData: Event<RiskTreeNode | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private readonly session: ShieldSession) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RiskTreeNode): TreeItem {
    return element;
  }

  getChildren(element?: RiskTreeNode): RiskTreeNode[] {
    if (!element) {
      return this.rootChildren();
    }
    if (element instanceof ShieldSectionItem) {
      return this.sectionChildren(element.sectionId);
    }
    return [];
  }

  private rootChildren(): RiskTreeNode[] {
    const nowMs = Date.now();
    const pulse = this.session.pulse(nowMs);
    const approaching = this.session.listApproachingIdle(nowMs);
    const history = this.session.sessionHistory();
    const reviewTotal =
      pulse.pendingCount + pulse.keptCount + pulse.filteredCount;
    const autoFilterOn = isAutoFilterEnabled();

    const nodes: RiskTreeNode[] = [
      new ShieldAutoFilterItem(autoFilterOn),
      new ShieldCloseOnHardItem(isCloseTabOnHardShieldEnabled()),
      new ShieldDurableItem(isDurableFilterEnabled()),
      new ShieldNotifyIdleItem(isNotifyOnIdleEnabled()),
      new ShieldActivePathsItem(this.session.registry.list().length),
    ];

    const effectivenessRollup = rollupShieldEffectiveness(this.session.leversAppliedSummary());
    for (const rollup of effectivenessRollup) {
      nodes.push(new ShieldEffectivenessItem(rollup));
    }

    if (reviewTotal === 0 && approaching.length === 0 && history.length === 0) {
      nodes.push(new ShieldEmptyItem());
      return nodes;
    }

    if (reviewTotal > 0) {
      nodes.push(
        new ShieldSummaryItem(
          pulse.displayAtRiskTokens,
          pulse.totals.savedTokens,
          pulse.totals.beforeTokens,
          this.session.sessionAvoidedTokens(),
        ),
        new ShieldSectionItem("pending", "Needs review", pulse.pendingCount),
        new ShieldSectionItem("kept", "Allowed", pulse.keptCount),
        new ShieldSectionItem("filtered", "Shielded", pulse.filteredCount),
      );
    } else if (history.length > 0) {
      nodes.push(
        new ShieldSummaryItem(
          pulse.displayAtRiskTokens,
          pulse.totals.savedTokens,
          pulse.totals.beforeTokens,
          this.session.sessionAvoidedTokens(),
        ),
      );
    }
    if (history.length > 0) {
      nodes.push(
        new ShieldSectionItem("history", "Shielded this session", history.length),
      );
    }
    if (approaching.length > 0) {
      nodes.push(
        new ShieldSectionItem("approaching", "Approaching idle", approaching.length),
      );
    }
    return nodes;
  }

  private sectionChildren(sectionId: SectionId): RiskTreeNode[] {
    const nowMs = Date.now();
    if (sectionId === "history") {
      return this.session
        .sessionHistory()
        .map((entry) => new ShieldHistoryItem(entry));
    }

    const activeUri = this.session.registry.getActiveUri();
    const tabs =
      sectionId === "pending"
        ? this.session.listPendingAtRisk(nowMs)
        : sectionId === "kept"
          ? this.session.listKeptAtRisk(nowMs)
          : sectionId === "filtered"
            ? this.session.listFilteredAtRisk(nowMs)
            : this.session.listApproachingIdle(nowMs);

    const decision =
      sectionId === "filtered"
        ? "filtered"
        : sectionId === "approaching"
          ? "approaching"
          : sectionId === "kept"
            ? "kept"
            : "pending";

    return tabs
      .slice()
      .sort((a, b) => b.assessment.estTokens - a.assessment.estTokens)
      .map(
        (tab) =>
          new RiskTabItem(tab, decision, this.session, nowMs, {
            background: activeUri !== tab.uri,
          }),
      );
  }
}

export type RiskPanelHandle = {
  view: TreeView<RiskTreeNode>;
  provider: RiskPanelProvider;
  dispose(): void;
};

function syncAutoFilterChrome(view: TreeView<RiskTreeNode>): void {
  const enabled = isAutoFilterEnabled();
  view.message = enabled
    ? "Auto-shield ON — lockfile/generated tabs Shield automatically."
    : undefined;
  view.title = enabled ? "Open tabs · Auto-shield" : "Open tabs";
}

export function createRiskPanel(
  session: ShieldSession,
  context: ExtensionContext,
): RiskPanelHandle {
  const provider = new RiskPanelProvider(session);
  const view = window.createTreeView(RISK_PANEL_VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  const syncBadge = (): void => {
    provider.refresh();
    syncAutoFilterChrome(view);
    const count = session.listDisplayAtRisk().length;
    const tokens = session.displayAtRiskTokens();
    view.badge =
      count > 0
        ? { value: count, tooltip: `${formatTokenCount(tokens)} context cost` }
        : undefined;
  };

  const subscription = session.onDidChange(syncBadge);
  const configSub = workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration("tokenforge.autoFilterHighRisk") ||
      event.affectsConfiguration("tokenforge.closeTabOnHardShield") ||
      event.affectsConfiguration("tokenforge.durableFilterDecisions") ||
      event.affectsConfiguration("tokenforge.notifyOnIdle")
    ) {
      syncBadge();
    }
  });
  startUiTicker(syncBadge, context);
  syncBadge();

  context.subscriptions.push(view, subscription, configSub);

  return {
    view,
    provider,
    dispose: () => {
      subscription.dispose();
      configSub.dispose();
      view.dispose();
    },
  };
}

/** Toggle helpers wired from index.ts for settings rows. */
export async function toggleCloseTabOnHardShieldSetting(): Promise<boolean> {
  const config = workspace.getConfiguration("tokenforge");
  const next = !config.get<boolean>("closeTabOnHardShield", false);
  await config.update("closeTabOnHardShield", next, true);
  return next;
}

export async function toggleNotifyOnIdleSetting(): Promise<boolean> {
  const config = workspace.getConfiguration("tokenforge");
  const next = !config.get<boolean>("notifyOnIdle", false);
  await config.update("notifyOnIdle", next, true);
  return next;
}

export { toggleDurableFilterDecisions };
