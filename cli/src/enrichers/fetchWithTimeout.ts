import { Agent, fetch as undiciFetch } from "undici";

export type TimedFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  signal?: AbortSignal;
};

/**
 * Fetch with undici timeouts aligned to `timeoutMs`.
 *
 * Node's default `fetch` uses undici with a hard 300s `headersTimeout`. Local
 * Ollama calls with `stream: false` often send headers only after generation
 * finishes, so --llm-timeout alone is not enough without this dispatcher.
 */
export async function fetchWithTimeout(
  url: string,
  init: TimedFetchInit,
  timeoutMs: number,
): Promise<Response> {
  const safeTimeoutMs = Math.max(1, Math.floor(timeoutMs));
  const dispatcher = new Agent({
    headersTimeout: safeTimeoutMs,
    bodyTimeout: safeTimeoutMs,
    connectTimeout: Math.min(60_000, safeTimeoutMs),
  });

  try {
    // Cast init: @types/node undici-types and the undici package disagree on FormData.
    return (await undiciFetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body ?? undefined,
      signal: init.signal,
      dispatcher,
    } as Parameters<typeof undiciFetch>[1])) as unknown as Response;
  } finally {
    await dispatcher.close();
  }
}
