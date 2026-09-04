import { parseLlmSpec } from "@tokenforge/enrichers";
import type { LlmBackendId } from "@tokenforge/risk-core";
import { window, workspace, ConfigurationTarget } from "vscode";
import { isExternalBackend, readLlmSettings } from "./settings";

const EXTERNAL_COACH_DETAIL = [
  "Hybrid enrichment may send bounded candidate excerpts off this machine.",
  "Ollama stays local — no flag needed.",
  "External CLI/API backends require tokenforge.allowExternalLlm (same honesty gate as CLI --allow-external).",
  "TokenForge does not intercept any vendor's private context pipeline.",
].join("\n");

/** Prompt before enabling enrichment when the configured backend is external. */
export async function coachExternalSendOnEnable(): Promise<boolean> {
  const settings = readLlmSettings();
  let backend: LlmBackendId;
  try {
    backend = parseLlmSpec(settings.llm).backend;
  } catch {
    return true;
  }
  if (!isExternalBackend(backend)) {
    return true;
  }
  if (settings.allowExternal) {
    return true;
  }

  const choice = await window.showWarningMessage(
    `Enable AI enrichment with external backend "${settings.llm}"?`,
    { modal: true, detail: EXTERNAL_COACH_DETAIL },
    "Enable & allow external",
    "Use local Ollama instead",
    "Cancel",
  );
  if (choice === "Enable & allow external") {
    await workspace
      .getConfiguration("tokenforge")
      .update("allowExternalLlm", true, ConfigurationTarget.Workspace);
    return true;
  }
  if (choice === "Use local Ollama instead") {
    await workspace
      .getConfiguration("tokenforge")
      .update("llm", "ollama:qwen2.5-coder:3b", ConfigurationTarget.Workspace);
    return true;
  }
  return false;
}
