import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  type Event,
  type ExtensionContext,
  type TreeDataProvider,
  type TreeView,
} from "vscode";
import { primaryReason } from "@tokenforge/risk-core";
import type { TabDecision } from "../filter/types";
import type { RiskSession } from "../session/riskSession";
import { idleHintForTab } from "../tabs/idleHint";
import type { TrackedTab } from "../tabs/types";
import { formatTokenCount } from "./formatTokens";
import { startUiTicker } from "./uiTicker";

export const RISK_PANEL_VIEW_ID = "tokenforge.riskPanel";

type SectionId = "pending" | "kept" | "filtered" | "approaching";

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
            : "clock",
    );
  }
}

export class RiskSummaryItem extends TreeItem {
  constructor(atRiskTokens: number, savedTokens: number, beforeTokens: number) {
    super("Live estimate", TreeItemCollapsibleState.None);
    this.description =
      savedTokens > 0
        ? `${formatTokenCount(atRiskTokens)} at risk · ${formatTokenCount(savedTokens)} saved`
        : `${formatTokenCount(atRiskTokens)} at risk`;
    this.tooltip = [
      `Open-tab estimate: ${beforeTokens} tokens`,
      `Still at risk: ${atRiskTokens} tokens`,
      savedTokens > 0
        ? `Saved by Filter: ${savedTokens} tokens`
        : "Filter a tab to record savings in last-scan.json",
      "",
      "Recommendations only — TokenForge does not intercept any agent pipeline.",
    ].join("\n");
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

export type RiskTreeNode = RiskSummaryItem | RiskSectionItem | RiskTabItem | RiskEmptyItem;

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
    const atRiskTotal =
      pulse.pendingCount + pulse.keptCount + pulse.filteredCount;

    if (atRiskTotal === 0 && approaching.length === 0) {
      return [new RiskEmptyItem()];
    }

    const nodes: RiskTreeNode[] = [];
    if (atRiskTotal > 0) {
      nodes.push(
        new RiskSummaryItem(
          pulse.displayAtRiskTokens,
          pulse.totals.savedTokens,
          pulse.totals.beforeTokens,
        ),
        new RiskSectionItem("pending", "Pending", pulse.pendingCount),
        new RiskSectionItem("kept", "Kept", pulse.keptCount),
        new RiskSectionItem("filtered", "Filtered", pulse.filteredCount),
      );
    }
    if (approaching.length > 0) {
      nodes.push(
        new RiskSectionItem("approaching", "Approaching idle", approaching.length),
      );
    }
    if (nodes.length === 0) {
      return [new RiskEmptyItem()];
    }
    return nodes;
  }

  private sectionChildren(sectionId: SectionId): RiskTabItem[] {
    const nowMs = Date.now();
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
    const count = session.listDisplayAtRisk().length;
    const tokens = session.displayAtRiskTokens();
    view.badge =
      count > 0
        ? { value: count, tooltip: `${formatTokenCount(tokens)} tokens at risk` }
        : undefined;
  };

  const subscription = session.onDidChange(syncBadge);
  startUiTicker(syncBadge, context);
  syncBadge();

  context.subscriptions.push(view, subscription);

  return {
    view,
    provider,
    dispose: () => {
      subscription.dispose();
      view.dispose();
    },
  };
}
