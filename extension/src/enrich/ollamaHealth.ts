import { DEFAULT_OLLAMA_ENDPOINT } from "@tokenforge/enrichers";

/**
 * Quick, bounded reachability check for a local Ollama server via `/api/tags`.
 * Used before Analyze rules so an offline Ollama produces an honest warning and
 * keeps the heuristic path, instead of hanging or throwing a full-timeout error.
 */
export async function isOllamaReachable(
  endpoint: string = DEFAULT_OLLAMA_ENDPOINT,
  timeoutMs = 3000,
): Promise<boolean> {
  const base = endpoint.replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}/api/tags`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function resolveOllamaEndpoint(endpoint?: string): string {
  const trimmed = endpoint?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_OLLAMA_ENDPOINT;
}
