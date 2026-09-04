import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  completeJson,
  parseLlmSpec,
  parseLlmTimeoutSeconds,
} from "@tokenforge/enrichers";
import { window } from "vscode";
import type { ShieldSession } from "../session/shieldSession";
import { isOllamaReachable, resolveOllamaEndpoint } from "../enrich/ollamaHealth";
import { isExternalBackend, readLlmSettings } from "../enrich/settings";
import { resolveWorkspaceRoot } from "../export/writeLastScan";
import { buildSessionSummary } from "./sessionSummary";

export const SESSION_NARRATIVE_FILE = "session-narrative.md";

const HONESTY_FOOTER =
  "\n\n---\n\n*Estimate only — TokenForge does not intercept any agent or LLM private context pipeline. " +
  "Session savings ≠ invoice delta; import billed usage into the Prove dashboard to reconcile.*\n";

type NarrativeResult = {
  body: string;
  source: "heuristic" | "ollama" | "external-blocked";
  note?: string;
};

function buildNarrativePrompt(heuristicText: string): string {
  return [
    "Write one short paragraph summarizing IDE session context hygiene for a developer.",
    "Use ONLY the facts below — do not invent metrics or claim billing impact.",
    'Respond as JSON: { "narrative": "..." }',
    "",
    heuristicText,
  ].join("\n");
}

function parseNarrativePayload(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { narrative?: unknown }).narrative === "string"
  ) {
    const text = String((payload as { narrative: string }).narrative).trim();
    if (text.length > 0) {
      return text;
    }
  }
  return fallback;
}

async function resolveAiNarrative(heuristicText: string): Promise<NarrativeResult> {
  const settings = readLlmSettings();
  const spec = parseLlmSpec(settings.llm);

  if (isExternalBackend(spec.backend)) {
    return {
      body: heuristicText,
      source: "external-blocked",
      note:
        `AI narrative uses local Ollama only today; "${spec.backend}" would send excerpts off-machine. ` +
        "Wrote heuristic summary to disk.",
    };
  }

  if (spec.backend !== "ollama") {
    return {
      body: heuristicText,
      source: "heuristic",
      note: "Set tokenforge.llm to ollama:<model> for a one-shot local summary.",
    };
  }

  const endpoint = resolveOllamaEndpoint(settings.endpoint);
  if (!(await isOllamaReachable(endpoint))) {
    return {
      body: heuristicText,
      source: "heuristic",
      note: `Ollama unreachable at ${endpoint}. Wrote heuristic summary instead.`,
    };
  }

  const timeoutMs =
    settings.timeoutSeconds !== undefined
      ? parseLlmTimeoutSeconds(String(settings.timeoutSeconds))
      : undefined;

  try {
    const payload = await completeJson({
      backend: spec.backend,
      model: spec.model,
      prompt: buildNarrativePrompt(heuristicText),
      endpoint: settings.endpoint,
      timeoutMs,
    });
    return {
      body: parseNarrativePayload(payload, heuristicText),
      source: "ollama",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      body: heuristicText,
      source: "heuristic",
      note: `Ollama summary failed (${reason}). Wrote heuristic summary instead.`,
    };
  }
}

async function writeSessionNarrativeFile(body: string): Promise<string> {
  const root = resolveWorkspaceRoot();
  const dir = join(root, ".tokenforge");
  await mkdir(dir, { recursive: true });
  const rel = join(".tokenforge", SESSION_NARRATIVE_FILE);
  const abs = join(root, rel);
  await writeFile(abs, `# Session narrative\n\n${body.trim()}${HONESTY_FOOTER}`, "utf8");
  return rel;
}

/**
 * Optional session hygiene narrative (#276).
 *
 * Heuristic summary is always free. AI path is opt-in, clearly costed, and
 * does not claim interception of any vendor's private context pipeline.
 */
export async function runSessionNarrativeCommand(session: ShieldSession): Promise<void> {
  const heuristic = buildSessionSummary(session);
  const settings = readLlmSettings();

  const choice = await window.showQuickPick(
    [
      {
        label: "Heuristic summary (free)",
        description: "Deterministic KPI sentences from this session",
        mode: "heuristic" as const,
      },
      {
        label: "AI narrative (uses tokens)",
        description: settings.enrichmentEnabled
          ? `Uses ${settings.llm} — local Ollama only for one-shot summary`
          : "Enable TokenForge › LLM Enrichment first",
        mode: "ai" as const,
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
    const rel = await writeSessionNarrativeFile(heuristic.narrative);
    void window.showInformationMessage(
      `Session hygiene (estimate): ${heuristic.narrative}`,
      "OK",
    );
    void window.showInformationMessage(`Wrote ${rel}`);
    return;
  }

  if (!settings.enrichmentEnabled) {
    const rel = await writeSessionNarrativeFile(heuristic.narrative);
    void window.showWarningMessage(
      "AI narrative is opt-in. Enable tokenforge.llmEnrichment for this workspace, then retry. Wrote heuristic summary instead.",
    );
    void window.showInformationMessage(`Wrote ${rel}`);
    return;
  }

  const resolved = await resolveAiNarrative(heuristic.narrative);
  const rel = await writeSessionNarrativeFile(resolved.body);
  const prefix =
    resolved.source === "ollama"
      ? "AI narrative (local Ollama — estimate only)"
      : "Session hygiene (estimate)";
  void window.showInformationMessage(`${prefix}: ${resolved.body}`, "OK");
  if (resolved.note) {
    void window.showInformationMessage(resolved.note);
  }
  void window.showInformationMessage(`Wrote ${rel}`);
}
