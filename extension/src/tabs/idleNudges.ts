import { commands, window, workspace, type ExtensionContext } from "vscode";
import { BACKGROUND_INACTIVE_MS, INACTIVE_MS } from "@tokenforge/risk-core";
import type { TabRegistry } from "./registry";
import { formatTokenCount } from "../ui/formatTokens";

const notifiedUris = new Set<string>();

function idleThresholdMs(background: boolean): number {
  const config = workspace.getConfiguration("tokenforge");
  const focusedMin = config.get<number>("idleMinutesFocused", 10);
  const backgroundMin = config.get<number>("idleMinutesBackground", 5);
  if (background) {
    return backgroundMin * 60_000 || BACKGROUND_INACTIVE_MS;
  }
  return focusedMin * 60_000 || INACTIVE_MS;
}

/** Toast when tabs cross idle thresholds (opt-in via tokenforge.notifyOnIdle). */
export function startIdleNudges(registry: TabRegistry, context: ExtensionContext): void {
  const tick = (): void => {
    if (!workspace.getConfiguration("tokenforge").get<boolean>("notifyOnIdle", false)) {
      return;
    }
    const activeUri = registry.getActiveUri();
    const nowMs = Date.now();
    for (const tab of registry.list()) {
      if (!tab.assessment.atRisk || !tab.assessment.reasons.includes("inactive_tab")) {
        continue;
      }
      if (notifiedUris.has(tab.uri)) {
        continue;
      }
      const background = activeUri !== tab.uri;
      const threshold = idleThresholdMs(background);
      const idleMs = nowMs - tab.lastActivityAt;
      if (idleMs < threshold) {
        continue;
      }
      notifiedUris.add(tab.uri);
      void window.showInformationMessage(
        `TokenForge: ${tab.path.split(/[/\\]/).pop()} is idle (~${formatTokenCount(tab.assessment.estTokens)} context). Shield or Allow?`,
        "Open tabs",
      ).then((choice) => {
        if (choice === "Open tabs") {
          void commands.executeCommand("tokenforge.focusRiskPanel");
        }
      });
    }
  };

  const handle = setInterval(tick, 60_000);
  context.subscriptions.push({ dispose: () => clearInterval(handle) });
  registry.onDidChange(() => {
    for (const tab of registry.list()) {
      if (!tab.assessment.atRisk) {
        notifiedUris.delete(tab.uri);
      }
    }
  });
}
