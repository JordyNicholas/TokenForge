import type { ExtensionContext } from "vscode";

const UI_TICK_MS = 15_000;

/**
 * Periodic UI refresh so idle countdowns advance between score ticks.
 * Does not re-score tabs — callers should still run the 60s inactivity timer.
 */
export function startUiTicker(
  onTick: () => void,
  context: ExtensionContext,
  intervalMs: number = UI_TICK_MS,
): void {
  const handle = setInterval(onTick, intervalMs);
  context.subscriptions.push({ dispose: () => clearInterval(handle) });
}
