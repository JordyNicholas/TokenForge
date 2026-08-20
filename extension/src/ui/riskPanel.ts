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
import type { TrackedTab } from "../tabs/types";
import { formatTokenCount } from "./formatTokens";

export const RISK_PANEL_VIEW_ID = "tokenforge.riskPanel";

type SectionId = "pending" | "kept" | "filtered";

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
      sectionId === "pending" ? "warning" : sectionId === "kept" ? "pinned" : "filter",
    );
  }
}

export class RiskSummaryItem extends TreeItem {
  constructor(atRiskTokens: number, savedTokens: number, beforeTokens: number) {
    super("Live estimate", TreeItemCollapsibleState.None);
    this.description = `${formatTokenCount(atRiskTokens)} at risk · ${formatTokenCount(savedTokens)} saved`;
    this.tooltip = [
      `Before: ${beforeTokens} tokens`,
      `Still at risk: ${atRiskTokens} tokens`,
      `Saved by Filter: ${savedTokens} tokens`,
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
    this.description = "Open noisy files or wait 15m idle";
    this.tooltip =
      "TokenForge scores open editors for inactive / high-risk context. This is hygiene advice, not interception.";
    this.iconPath = new ThemeIcon("pass");
    this.contextValue = "tokenforge.empty";
  }
}

export class RiskTabItem extends TreeItem {
  constructor(
    readonly tab: TrackedTab,
    readonly decision: Exclude<TabDecision, "filtered"> | "filtered",
  ) {
    super(tab.path, TreeItemCollapsibleState.None);
    const reason = primaryReason(tab.assessment.reasons) ?? "at-risk";
    this.description = `${formatTokenCount(tab.assessment.estTokens)} · ${reason}`;
    this.tooltip = `${tab.path}\n${tab.assessment.estTokens} est. tokens · score ${tab.assessment.score}`;
    if (decision === "filtered") {
      this.contextValue = "tokenforge.filteredTab";
      this.iconPath = new ThemeIcon("filter");
    } else if (decision === "kept") {
      this.contextValue = "tokenforge.keptTab";
      this.iconPath = new ThemeIcon("pinned");
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
    const pulse = this.session.pulse();
    const atRiskTotal =
      pulse.pendingCount + pulse.keptCount + pulse.filteredCount;

    if (atRiskTotal === 0) {
      return [new RiskEmptyItem()];
    }

    return [
      new RiskSummaryItem(
        pulse.displayAtRiskTokens,
        pulse.totals.savedTokens,
        pulse.totals.beforeTokens,
      ),
      new RiskSectionItem("pending", "Pending", pulse.pendingCount),
      new RiskSectionItem("kept", "Kept", pulse.keptCount),
      new RiskSectionItem("filtered", "Filtered", pulse.filteredCount),
    ];
  }

  private sectionChildren(sectionId: SectionId): RiskTabItem[] {
    const tabs =
      sectionId === "pending"
        ? this.session.listPendingAtRisk()
        : sectionId === "kept"
          ? this.session.listKeptAtRisk()
          : this.session.listFilteredAtRisk();

    return tabs
      .slice()
      .sort((a, b) => b.assessment.estTokens - a.assessment.estTokens)
      .map((tab) => new RiskTabItem(tab, sectionId === "filtered" ? "filtered" : sectionId));
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
