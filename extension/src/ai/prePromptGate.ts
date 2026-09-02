import { window, workspace } from "vscode";
import type { ShieldSession } from "../session/shieldSession";

/** Heuristic stub — nudge when context cost is high before an agent turn. */
export async function runPrePromptGate(session: ShieldSession): Promise<boolean> {
  const enabled = workspace.getConfiguration("tokenforge").get<boolean>("prePromptGate", false);
  if (!enabled) {
    return true;
  }

  const contextCost = session.displayAtRiskTokens();
  const threshold = workspace.getConfiguration("tokenforge").get<number>("rulesBudgetThreshold", 8_000);
  if (contextCost < threshold) {
    return true;
  }

  const choice = await window.showWarningMessage(
    `Context cost is ~${contextCost} tokens. Shield noisy tabs before your next agent turn?`,
    "Shield all pending",
    "Continue anyway",
  );
  if (choice === "Shield all pending") {
    await session.shieldAllPending("hard");
    return true;
  }
  return choice === "Continue anyway";
}
