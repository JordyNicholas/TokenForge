import { commands, ExtensionContext, window } from "vscode";
import { TabRegistry } from "./tabs/registry";
import { trackTabs } from "./tabs/trackTabs";
import { startInactivityTimer } from "./tabs/inactivityTimer";

export function activate(context: ExtensionContext): void {
  const registry = new TabRegistry();
  trackTabs(registry, context);

  const hello = commands.registerCommand("tokenforge.hello", () => {
    const atRisk = registry.listAtRisk();
    const summary = atRisk.length
      ? `${atRisk.length} at-risk: ${atRisk.map((tab) => tab.path).join(", ")}`
      : "No at-risk tabs";

    window.showInformationMessage(`TokenForge - ${summary}`);
  });
  context.subscriptions.push(hello);

  startInactivityTimer(registry, context);
}

export function deactivate(): void {}
