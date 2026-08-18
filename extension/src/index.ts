import {
  INACTIVE_MS,
} from "@tokenforge/risk-core";
import { commands, ExtensionContext, window } from "vscode";

export function activate(context: ExtensionContext): void {
  const hello = commands.registerCommand("tokenforge.hello", () => {
    window.showInformationMessage(
      `TokenForge Context Guard is active (inactive threshold: ${INACTIVE_MS / 60000} minutes)`
    )
  })
  context.subscriptions.push(hello);
}

export function deactivate(): void {}