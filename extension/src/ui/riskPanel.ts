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
import { primaryReason } from "@tokenforge/risk-core";
import { isAutoFilterEnabled } from "../filter/autoFilterSettings";
import type { TabDecision } from "../filter/types";
import type { RiskSession } from "../session/riskSession";
import type { SessionLedgerEntry } from "../session/sessionLedger";
import { idleHintForTab } from "../tabs/idleHint";
import type { TrackedTab } from "../tabs/types";
import { formatTokenCount } from "./formatTokens";
import { startUiTicker } from "./uiTicker";

export const RISK_PANEL_VIEW_ID = "tokenforge.riskPanel";

type SectionId = "pending" | "kept" | "filtered" | "approaching" | "history";

export class RiskAutoFilterItem extends TreeItem {
  constructor(enabled: boolean) {
    super("Auto-filter high-risk", TreeItemCollapsibleState.None);
    this.description = enabled ? "On · lockfile / generated" : "Off";
    this.tooltip = enabled
      ? "Auto-filter is ON. Pending lockfile and generated tabs Filter automatically. Click to turn off."
      : "Auto-filter is OFF. Click to auto-Filter pending lockfile and generated tabs.";
    this.iconPath = new ThemeIcon(enabled ? "check" : "zap");
    this.contextValue = enabled
      ? "tokenforge.autoFilterOn"
      : "tokenforge.autoFilterOff";
    this.command = {
      command: "tokenforge.toggleAutoFilterHighRisk",
      title: "Toggle Auto-filter High-Risk",
    };
  }
}

export class RiskSectionItem extends TreeItem {
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
            ? "filter"
            : sectionId === "history"
              ? "history"
              : "clock",
    );
  }
}

export class RiskSummaryItem extends TreeItem {
  constructor(
    atRiskTokens: number,
    savedTokens: number,
    beforeTokens: number,
    sessionAvoidedTokens: number,
  ) {
    super("Live estimate", TreeItemCollapsibleState.None);
    const liveSaved =
      savedTokens > 0 ? ` · ${formatTokenCount(savedTokens)} saved` : "";
    const sessionSaved =
      sessionAvoidedTokens > 0
        ? ` · ${formatTokenCount(sessionAvoidedTokens)} session`
        : "";
    this.description = `${formatTokenCount(atRiskTokens)} at risk${liveSaved}${sessionSaved}`;
    this.tooltip = [
      `Open-tab estimate: ${beforeTokens} tokens`,
      `Still at risk: ${atRiskTokens} tokens`,
      savedTokens > 0
        ? `Saved by Filter (open tabs): ${savedTokens} tokens`
        : "Filter a tab to record savings in last-scan.json",
      sessionAvoidedTokens > 0
        ? `Session avoided (this window): ${sessionAvoidedTokens} tokens`
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

export class RiskEmptyItem extends TreeItem {
  constructor() {
    super("No at-risk tabs", TreeItemCollapsibleState.None);
    this.description = "Open noisy files or wait for idle (10m focused / 5m background)";
    this.tooltip =
      "TokenForge scores open editors for inactive / high-risk context. This is hygiene advice, not interception.";
    this.iconPath = new ThemeIcon("pass");
    this.contextValue = "tokenforge.empty";
  }
}

export class RiskTabItem extends TreeItem {
  constructor(
    readonly tab: TrackedTab,
    readonly decision: Exclude<TabDecision, "filtered"> | "filtered" | "approaching",
    nowMs: number = Date.now(),
    options: { background?: boolean } = {},
  ) {
    super(tab.path, TreeItemCollapsibleState.None);
    const reason = primaryReason(tab.assessment.reasons);
    const background = options.background ?? false;
    const hint = idleHintForTab(tab, nowMs, { background });
    const bits = [
      formatTokenCount(tab.assessment.estTokens),
      reason,
      hint?.label,
    ].filter(Boolean);
    this.description = bits.join(" · ");
    this.tooltip = [
      tab.path,
      `${tab.assessment.estTokens} est. tokens · score ${tab.assessment.score}`,
      hint ? hint.label : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    if (decision === "filtered") {
      this.contextValue = "tokenforge.filteredTab";
      this.iconPath = new ThemeIcon("filter");
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

export class RiskHistoryItem extends TreeItem {
  constructor(readonly entry: SessionLedgerEntry) {
    super(entry.path, TreeItemCollapsibleState.None);
    this.description = [formatTokenCount(entry.estTokens), entry.reason]
      .filter(Boolean)
      .join(" · ");
    this.tooltip = [
      entry.path,
      `${entry.estTokens} est. tokens · ${entry.reason}`,
      "Filtered this session — remains after tab close until Restore or Clear decisions.",
    ].join("\n");
    this.iconPath = new ThemeIcon("filter");
    this.contextValue = "tokenforge.historyTab";
    this.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [Uri.parse(entry.uri)],
    };
  }
}

export type RiskTreeNode =
  | RiskAutoFilterItem
  | RiskSummaryItem
  | RiskSectionItem
  | RiskTabItem
  | RiskHistoryItem
  | RiskEmptyItem;

class RiskPanelProvider implements TreeDataProvider<RiskTreeNode> {
  private readonly _onDidChangeTreeData = new EventEmitter<RiskTreeNode | undefined | void>();
  readonly onDidChangeTreeData: Event<RiskTreeNode | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private readonly session: RiskSession) {}

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
    if (element instanceof RiskSectionItem) {
      return this.sectionChildren(element.sectionId);
    }
    return [];
  }

  private rootChildren(): RiskTreeNode[] {
    const nowMs = Date.now();
    const pulse = this.session.pulse(nowMs);
    const approaching = this.session.listApproachingIdle(nowMs);
    const history = this.session.sessionHistory();
    const atRiskTotal =
      pulse.pendingCount + pulse.keptCount + pulse.filteredCount;
    const autoFilterOn = isAutoFilterEnabled();

    const nodes: RiskTreeNode[] = [new RiskAutoFilterItem(autoFilterOn)];

    if (atRiskTotal === 0 && approaching.length === 0 && history.length === 0) {
      nodes.push(new RiskEmptyItem());
      return nodes;
    }

    if (atRiskTotal > 0) {
      nodes.push(
        new RiskSummaryItem(
          pulse.displayAtRiskTokens,
          pulse.totals.savedTokens,
          pulse.totals.beforeTokens,
          this.session.sessionAvoidedTokens(),
        ),
        new RiskSectionItem("pending", "Pending", pulse.pendingCount),
        new RiskSectionItem("kept", "Kept", pulse.keptCount),
        new RiskSectionItem("filtered", "Filtered", pulse.filteredCount),
      );
    } else if (history.length > 0) {
      nodes.push(
        new RiskSummaryItem(
          pulse.displayAtRiskTokens,
          pulse.totals.savedTokens,
          pulse.totals.beforeTokens,
          this.session.sessionAvoidedTokens(),
        ),
      );
    }
    if (history.length > 0) {
      nodes.push(
        new RiskSectionItem("history", "Filtered this session", history.length),
      );
    }
    if (approaching.length > 0) {
      nodes.push(
        new RiskSectionItem("approaching", "Approaching idle", approaching.length),
      );
    }
    return nodes;
  }

  private sectionChildren(sectionId: SectionId): RiskTreeNode[] {
    const nowMs = Date.now();
    if (sectionId === "history") {
      return this.session
        .sessionHistory()
        .map((entry) => new RiskHistoryItem(entry));
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
          new RiskTabItem(tab, decision, nowMs, {
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
    ? "Auto-filter ON — lockfile/generated tabs Filter automatically."
    : undefined;
  view.title = enabled ? "At-risk tabs · Auto" : "At-risk tabs";
}

export function createRiskPanel(
  session: RiskSession,
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
        ? { value: count, tooltip: `${formatTokenCount(tokens)} tokens at risk` }
        : undefined;
  };

  const subscription = session.onDidChange(syncBadge);
  const configSub = workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("tokenforge.autoFilterHighRisk")) {
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
