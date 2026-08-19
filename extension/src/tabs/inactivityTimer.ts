import { ExtensionContext } from "vscode";
import { TabRegistry } from "./registry";

const TICK_MS = 60_000;

export function startInactivityTimer(registry: TabRegistry, context: ExtensionContext): void {
  const handle = setInterval(() => registry.refresh(), TICK_MS);
  context.subscriptions.push({ dispose: () => clearInterval(handle)})
}
