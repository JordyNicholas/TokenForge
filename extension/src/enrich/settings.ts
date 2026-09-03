import type { LlmBackendId } from "@tokenforge/risk-core";
import { ConfigurationTarget, workspace } from "vscode";

export type ExtensionLlmSettings = {
  /** When false, enrichment command refuses to run (heuristic-first default). */
  enrichmentEnabled: boolean;
  /** Same shape as CLI `--llm` (e.g. `ollama:qwen2.5-coder:7b`, `anthropic:…`, `codex`, `claude-code`). */
  llm: string;
  endpoint?: string;
  timeoutSeconds?: number;
  allowExternal: boolean;
};

export function readLlmSettings(): ExtensionLlmSettings {
  const config = workspace.getConfiguration("tokenforge");
  const llm = config.get<string>("llm")?.trim() || "noop";
  const endpoint = config.get<string>("llmEndpoint")?.trim();
  const timeoutSeconds = config.get<number>("llmTimeout");
  return {
    enrichmentEnabled: config.get<boolean>("llmEnrichment") === true,
    llm,
    endpoint: endpoint && endpoint.length > 0 ? endpoint : undefined,
    timeoutSeconds:
      typeof timeoutSeconds === "number" && Number.isFinite(timeoutSeconds)
        ? timeoutSeconds
        : undefined,
    allowExternal: config.get<boolean>("allowExternalLlm") === true,
  };
}

/**
 * Backends that send candidate excerpts off this machine, and so need
 * `tokenforge.allowExternalLlm`.
 *
 * Listed as an allowlist of *local* backends rather than of external ones: a
 * new backend added to `LlmBackendId` is external until someone says otherwise,
 * which is the safe direction to be wrong in. `claude-code` is external for the
 * same reason `codex` is — a CLI signed in to a vendor account is still the
 * network.
 */
const LOCAL_BACKENDS: ReadonlySet<LlmBackendId> = new Set<LlmBackendId>([
  "noop",
  "ollama",
]);

export function isExternalBackend(backend: LlmBackendId): boolean {
  return !LOCAL_BACKENDS.has(backend);
}

/** Persist LLM enrichment on/off for the current workspace (resource-scoped). */
export async function setLlmEnrichmentEnabled(enabled: boolean): Promise<boolean> {
  if (!workspace.workspaceFolders?.length) {
    return false;
  }
  await workspace
    .getConfiguration("tokenforge")
    .update("llmEnrichment", enabled, ConfigurationTarget.Workspace);
  return enabled;
}

/** Flip the workspace enrichment setting and return the new value. */
export async function toggleLlmEnrichment(): Promise<boolean> {
  const next = workspace.getConfiguration("tokenforge").get<boolean>("llmEnrichment") !== true;
  await setLlmEnrichmentEnabled(next);
  return next;
}
