import {
  StatusBarAlignment,
  ThemeColor,
  window,
  workspace,
  type Disposable,
  type StatusBarItem,
} from "vscode";
import {
  describeEnrichmentStatus,
  getLastEnrichRun,
  onEnrichStatusChange,
} from "../enrich/enrichStatus";
import { readLlmSettings } from "../enrich/settings";
import { isAutoFilterEnabled } from "../filter/autoFilterSettings";
import type { ShieldSession } from "../session/shieldSession";
import { formatTokenCount } from "./formatTokens";

export function createStatusBar(session: ShieldSession): Disposable {
  const item: StatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
  item.command = "tokenforge.focusOverview";

  const refresh = (): void => {
    const contextCost = session.displayAtRiskTokens();
    const threshold = workspace
      .getConfiguration("tokenforge")
      .get<number>("rulesBudgetThreshold", 8_000);
    const highContext = contextCost >= threshold;
    const shieldedCount = session.listFilteredAtRisk().length;
    const sessionSaved = session.sessionAvoidedTokens();
    const auto = isAutoFilterEnabled();
    const autoSuffix = auto ? " · auto-shield" : "";
    const prepareHint = highContext ? " · prepare session" : "";
    const enrichment = describeEnrichmentStatus(
      {
        ...readLlmSettings(),
        provider: workspace.getConfiguration("tokenforge").get<string>("provider") ?? "generic",
      },
      getLastEnrichRun(),
    );
    item.text = `$(tokenforge-shield) ${formatTokenCount(contextCost)} context · ${shieldedCount} shielded · ${formatTokenCount(sessionSaved)} saved${autoSuffix}${prepareHint}`;
    item.command = highContext ? "tokenforge.prepareAgentSession" : "tokenforge.focusOverview";
    item.tooltip = [
      auto
        ? "TokenForge — Auto-shield ON (lockfile/generated)."
        : "TokenForge — AI Context Guard.",
      `Context cost: ${formatTokenCount(contextCost)} tokens (needs review + allowed).`,
      shieldedCount > 0 ? `${shieldedCount} tab(s) Shielded.` : undefined,
      sessionSaved > 0
        ? `Session saved (estimate hygiene): ${formatTokenCount(sessionSaved)} tokens.`
        : undefined,
      `${enrichment.headline}.`,
      highContext ? "High context cost — click to Prepare agent session." : "Click for Overview.",
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
  const enrichSub = onEnrichStatusChange(refresh);
  const configSub = workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration("tokenforge.autoFilterHighRisk") ||
      event.affectsConfiguration("tokenforge.llmEnrichment") ||
      event.affectsConfiguration("tokenforge.llm")
    ) {
      refresh();
    }
  });

  return {
    dispose: () => {
      subscription.dispose();
      enrichSub.dispose();
      configSub.dispose();
      item.dispose();
    },
  };
}
