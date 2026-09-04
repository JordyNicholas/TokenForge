import { window, type QuickPickItem } from "vscode";
import type { ShieldSession } from "../session/shieldSession";
import { readLlmSettings } from "../enrich/settings";
import { buildSessionSummary } from "./sessionSummary";

type NarrativePick = QuickPickItem & { mode: "heuristic" | "ai" };

/**
 * Optional session hygiene narrative (#276).
 *
 * Heuristic summary is always free. AI path is opt-in, clearly costed, and
 * does not claim interception of any vendor's private context pipeline.
 */
export async function runSessionNarrativeCommand(session: ShieldSession): Promise<void> {
  const heuristic = buildSessionSummary(session);
  const settings = readLlmSettings();

  const choice = await window.showQuickPick<NarrativePick>(
    [
      {
        label: "Heuristic summary (free)",
        description: "Deterministic KPI sentences from this session",
        mode: "heuristic",
      },
      {
        label: "AI narrative (uses tokens)",
        description: settings.enrichmentEnabled
          ? `Uses ${settings.llm} — excerpts may leave this machine for external backends`
          : "Enable TokenForge › LLM Enrichment first",
        mode: "ai",
      },
    ],
    {
      title: "Session narrative",
      placeHolder: "Optional — does not intercept agent chat context",
    },
  );

  if (!choice) {
    return;
  }

  if (choice.mode === "heuristic") {
    void window.showInformationMessage(
      `Session hygiene (estimate): ${heuristic.narrative}`,
    );
    return;
  }

  if (!settings.enrichmentEnabled) {
    void window.showWarningMessage(
      "AI narrative is opt-in. Enable tokenforge.llmEnrichment for this workspace, then retry. Showing heuristic summary instead.",
    );
    void window.showInformationMessage(
      `Session hygiene (estimate): ${heuristic.narrative}`,
    );
    return;
  }

  // Stub: no separate LLM prompt yet — reuse the deterministic narrative and
  // state the cost gate honestly until a bounded enricher call ships (#276).
  void window.showInformationMessage(
    `AI narrative (stub — uses your configured enricher when wired): ${heuristic.narrative}`,
    "OK",
  );
}
