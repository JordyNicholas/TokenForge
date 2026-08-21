import type { LlmBackendId } from "@tokenforge/risk-core";
import { workspace } from "vscode";

export type ExtensionLlmSettings = {
  /** When false, enrichment command refuses to run (heuristic-first default). */
  enrichmentEnabled: boolean;
  /** Same shape as CLI `--llm` (e.g. `ollama:qwen2.5-coder:7b`, `anthropic:…`, `codex`). */
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

export function isExternalBackend(backend: LlmBackendId): boolean {
  return backend === "anthropic" || backend === "codex";
}
