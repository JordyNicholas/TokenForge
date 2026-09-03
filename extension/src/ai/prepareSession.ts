import { commands, env, window, workspace } from "vscode";
import { applyTaskContextPack, formatTaskPackClipboard } from "./applyTaskPack";
import { runPrePromptGate } from "./prePromptGate";
import { buildTaskContextPack } from "./taskContextPack";
import type { ShieldSession } from "../session/shieldSession";

export type PrepareSessionResult = {
  applied: boolean;
  copied: boolean;
};

/**
 * Prepare = gate + optional task prompt + confirm Apply / copy.
 * Does not talk to any vendor agent pipeline (#260 / #262).
 */
export async function runPrepareAgentSession(
  session: ShieldSession,
): Promise<PrepareSessionResult> {
  const none = { applied: false, copied: false };
  const ok = await runPrePromptGate(session);
  if (!ok) {
    return none;
  }

  let taskPrompt: string | undefined;
  const enrichmentOn =
    workspace.getConfiguration("tokenforge").get<boolean>("llmEnrichment") === true;
  if (enrichmentOn) {
    const typed = await window.showInputBox({
      title: "Prepare agent session",
      prompt:
        "Optional: what are you working on? Leave empty to infer from the focused tab.",
      placeHolder: "e.g. fix login timeout",
      ignoreFocusOut: true,
    });
    if (typed === undefined) {
      return none;
    }
    taskPrompt = typed.trim() || undefined;
  }

  const pack = await buildTaskContextPack(session, { taskPrompt });
  const picked = await window.showQuickPick(
    [
      {
        label: "Apply pack",
        description: "Allow listed paths; soft-Shield other pending tabs (focused tab stays Allowed)",
      },
      {
        label: "Copy pack",
        description: "Clipboard only — paste into chat yourself",
      },
      {
        label: "Apply and copy",
        description: "Apply then copy the path list",
      },
      {
        label: "Review Open tabs",
        description: "Skip apply; focus the Open tabs view",
      },
    ],
    {
      title: `Task pack (${pack.source}): ${pack.paths.length} path(s), ~${pack.estTokens} tokens`,
      placeHolder: pack.paths.slice(0, 4).join(", ") || "No at-risk tabs in pack",
      ignoreFocusOut: true,
    },
  );

  if (!picked) {
    return none;
  }
  if (picked.label === "Review Open tabs") {
    await commands.executeCommand("tokenforge.focusRiskPanel");
    return none;
  }

  const shouldCopy =
    picked.label === "Copy pack" || picked.label === "Apply and copy";
  const shouldApply =
    picked.label === "Apply pack" || picked.label === "Apply and copy";

  if (shouldCopy) {
    await env.clipboard.writeText(formatTaskPackClipboard(pack));
    void window.showInformationMessage("Copied task pack to the clipboard.");
  }

  if (shouldApply) {
    const count = await applyTaskContextPack(session, pack);
    void window.showInformationMessage(
      count === 0
        ? "No pending tabs to adjust for this pack."
        : `Applied task pack to ${count} tab(s). ${pack.note}`,
    );
  }

  return { applied: shouldApply, copied: shouldCopy };
}
