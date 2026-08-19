import {
  INACTIVE_MS,
} from "@tokenforge/risk-core";
import { commands, ExtensionContext, window, workspace } from "vscode";
import { TabRegistry } from "./tabs/registry";
import { trackTabs } from "./tabs/trackTabs";

export function activate(context: ExtensionContext): void {
  const registry = new TabRegistry();
  trackTabs(registry);
  
  const hello = commands.registerCommand("tokenforge.hello", () => {
    window.showInformationMessage(
      `${registry.listAtRisk(Date.now())}`
    )
  })
  context.subscriptions.push(hello);

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(() => {}),
    workspace.onDidChangeTextDocument(() => {}),
    workspace.onDidOpenTextDocument(() => {}),
    workspace.onDidCloseTextDocument(() => {})
  );
}

export function deactivate(): void {
  window.showInformationMessage("TokenForge Extension deactivated");
}
