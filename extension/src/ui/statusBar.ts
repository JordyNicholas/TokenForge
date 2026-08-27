import {
  StatusBarAlignment,
  ThemeColor,
  window,
  workspace,
  type Disposable,
  type StatusBarItem,
} from "vscode";
import { isAutoFilterEnabled } from "../filter/autoFilterSettings";
import type { RiskSession } from "../session/riskSession";
import { formatTokenCount } from "./formatTokens";

export function createStatusBar(session: RiskSession): Disposable {
  const item: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
  item.command = "tokenforge.focusRiskPanel";

  const refresh = (): void => {
    const tokens = session.displayAtRiskTokens();
    const count = session.listDisplayAtRisk().length;
    const sessionSaved = session.sessionAvoidedTokens();
    const auto = isAutoFilterEnabled();
    const autoSuffix = auto ? " · auto" : "";
    const sessionSuffix =
      sessionSaved > 0 ? ` · ${formatTokenCount(sessionSaved)} saved` : "";
    if (count === 0) {
      item.text = `$(check) TokenForge: 0 at risk${sessionSuffix}${autoSuffix}`;
    } else {
      item.text = `$(warning) TokenForge: ${formatTokenCount(tokens)} at risk${sessionSuffix}${autoSuffix}`;
    }
    item.tooltip = [
      auto
        ? "TokenForge Context Guard — Auto-filter ON (lockfile/generated)."
        : "TokenForge Context Guard.",
      sessionSaved > 0
        ? `Session avoided (estimate hygiene): ${formatTokenCount(sessionSaved)} tokens.`
        : undefined,
      "Click to open panel.",
    ]
      .filter(Boolean)
      .join(" ");
    item.backgroundColor = auto
      ? new ThemeColor("statusBarItem.warningBackground")
      : undefined;
    item.show();
  };

  refresh();
  const subscription = session.onDidChange(refresh);
  const configSub = workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("tokenforge.autoFilterHighRisk")) {
      refresh();
    }
  });

  return {
    dispose: () => {
      subscription.dispose();
      configSub.dispose();
      item.dispose();
    },
  };
}
