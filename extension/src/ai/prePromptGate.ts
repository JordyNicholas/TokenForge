import { commands, window, workspace } from "vscode";
import type { ShieldSession } from "../session/shieldSession";

/**
 * Pre-turn gate: Proceed / Review tabs / Shield pending / dismiss = Skip (#260).
 */
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
    `Context cost is ~${contextCost} tokens. Review or Shield noisy tabs before your next agent turn?`,
    "Proceed",
    "Review tabs",
    "Shield pending",
  );
  if (choice === undefined) {
    return false;
  }
  if (choice === "Review tabs") {
    await commands.executeCommand("tokenforge.focusRiskPanel");
    return false;
  }
  if (choice === "Shield pending") {
    await session.shieldAllPending("hard");
    return true;
  }
  return true;
}
