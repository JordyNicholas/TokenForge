import { StatusBarAlignment, window, type Disposable, type StatusBarItem } from "vscode";
import type { RiskSession } from "../session/riskSession";
import { formatTokenCount } from "./formatTokens";

export function createStatusBar(session: RiskSession): Disposable {
  const item: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
  item.command = "tokenforge.focusRiskPanel";
  item.tooltip = "TokenForge Context Guard — open risk panel";

  const refresh = (): void => {
    const tokens = session.displayAtRiskTokens();
    const count = session.listDisplayAtRisk().length;
    if (count === 0) {
      item.text = "$(check) TokenForge: 0 at risk";
      item.backgroundColor = undefined;
    } else {
      item.text = `$(warning) TokenForge: ${formatTokenCount(tokens)} at risk`;
    }
    item.show();
  };

  refresh();
  const subscription = session.onDidChange(refresh);

  return {
    dispose: () => {
      subscription.dispose();
      item.dispose();
    },
  };
}
