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
import type { RiskSession } from "../session/riskSession";
import type { TrackedTab } from "../tabs/types";
import { formatTokenCount } from "./formatTokens";

export const RISK_PANEL_VIEW_ID = "tokenforge.riskPanel";

export class RiskTabItem extends TreeItem {
  constructor(
    readonly tab: TrackedTab,
    decision: "pending" | "kept" | "filtered",
  ) {
    super(tab.path, TreeItemCollapsibleState.None);
    const reason = primaryReason(tab.assessment.reasons) ?? "at-risk";
    const keptLabel = decision === "kept" ? " · kept" : "";
    this.description = `${formatTokenCount(tab.assessment.estTokens)} · ${reason}${keptLabel}`;
    this.tooltip = `${tab.path}\n${tab.assessment.estTokens} est. tokens · score ${tab.assessment.score}`;
    this.contextValue =
      decision === "kept" ? "tokenforge.keptTab" : "tokenforge.atRiskTab";
    this.iconPath = new ThemeIcon(decision === "kept" ? "pinned" : "warning");
    this.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [Uri.parse(tab.uri)],
    };
  }
}

class RiskPanelProvider implements TreeDataProvider<RiskTabItem> {
  private readonly _onDidChangeTreeData = new EventEmitter<RiskTabItem | undefined | void>();
  readonly onDidChangeTreeData: Event<RiskTabItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private readonly session: RiskSession) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RiskTabItem): TreeItem {
    return element;
  }

  getChildren(): RiskTabItem[] {
    return this.session.listDisplayAtRisk().map((tab) => {
      const decision = this.session.decision(tab.uri);
      return new RiskTabItem(tab, decision === "filtered" ? "pending" : decision);
    });
  }
}

export type RiskPanelHandle = {
  view: TreeView<RiskTabItem>;
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
    showCollapseAll: false,
  });

  const subscription = session.onDidChange(() => {
    provider.refresh();
    const count = session.listDisplayAtRisk().length;
    const tokens = session.displayAtRiskTokens();
    view.badge =
      count > 0
        ? { value: count, tooltip: `${formatTokenCount(tokens)} tokens at risk` }
        : undefined;
  });

  // Initial badge
  const count = session.listDisplayAtRisk().length;
  if (count > 0) {
    view.badge = {
      value: count,
      tooltip: `${formatTokenCount(session.displayAtRiskTokens())} tokens at risk`,
    };
  }

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
