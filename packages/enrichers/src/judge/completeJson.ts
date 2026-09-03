import type { LlmBackendId } from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../errors";
import { fetchWithTimeout } from "../fetchWithTimeout";
import {
  formatFetchFailure,
  isTransientFetchError,
  isTransientHttpStatus,
  isUndiciRequestTimeout,
  TransientHttpError,
  withRetries,
} from "../httpRetry";
import {
  DEFAULT_OLLAMA_ENDPOINT,
  OLLAMA_PREFLIGHT_TIMEOUT_MS,
  OLLAMA_RETRY_BASE_DELAY_MS,
  OLLAMA_TRANSIENT_RETRIES,
  resolveOllamaTimeoutMs,
} from "../limits";
import { extractJsonPayload } from "../structured";

const OLLAMA_CHAT_PATH = "/api/chat";
const OLLAMA_TAGS_PATH = "/api/tags";

export type CompleteJsonInput = {
  backend: LlmBackendId;
  model: string;
  prompt: string;
  endpoint?: string;
  timeoutMs?: number;
  onProgress?: (message: string) => void;
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

function baseUrl(endpoint: string): string {
  return endpoint.replace(/\/$/, "");
}

async function preflightOllama(endpoint: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_PREFLIGHT_TIMEOUT_MS);
  try {
    const response = await fetchWithTimeout(
      `${baseUrl(endpoint)}${OLLAMA_TAGS_PATH}`,
      { method: "GET", signal: controller.signal },
      OLLAMA_PREFLIGHT_TIMEOUT_MS,
    );
    if (!response.ok) {
      throw new RuntimeError(
        `Cannot reach Ollama at ${endpoint}. Preflight /api/tags returned ${response.status}.`,
      );
    }
  } catch (error) {
    if (error instanceof RuntimeError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new RuntimeError(
        `Cannot reach Ollama at ${endpoint}. Preflight timed out after ` +
          `${Math.round(OLLAMA_PREFLIGHT_TIMEOUT_MS / 1000)}s. Is the daemon running?`,
      );
    }
    throw new RuntimeError(
      `Cannot reach Ollama at ${endpoint}. Is the daemon running? ${formatFetchFailure(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function callOllamaChatOnce(
  endpoint: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<string> {
  const response = await fetchWithTimeout(
    `${baseUrl(endpoint)}${OLLAMA_CHAT_PATH}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    },
    timeoutMs,
  );

  if (!response.ok) {
    const body = await response.text();
    const detail = `Ollama request failed (${response.status}): ${body.slice(0, 300)}`;
    if (isTransientHttpStatus(response.status)) {
      throw new TransientHttpError(response.status, detail);
    }
    throw new RuntimeError(detail);
  }

  const payload = (await response.json()) as OllamaChatResponse;
  const content = payload.message?.content?.trim();
  if (!content) {
    throw new RuntimeError("Ollama returned an empty response.");
  }
  return content;
}

/**
 * Bounded JSON completion for extension judgment calls (task pack, overlap).
 * Local Ollama only for now — other backends fall through so callers keep the
 * heuristic path instead of inventing a second remote prompt stack.
 */
export async function completeJson(input: CompleteJsonInput): Promise<unknown> {
  if (input.backend === "noop") {
    throw new UsageError('Backend "noop" cannot complete JSON prompts.');
  }
  if (input.backend !== "ollama") {
    throw new UsageError(
      `JSON judgment via "${input.backend}" is not supported yet; use ollama or keep enrichment off for the heuristic path.`,
    );
  }

  const endpoint = input.endpoint?.trim() || DEFAULT_OLLAMA_ENDPOINT;
  const timeoutMs = resolveOllamaTimeoutMs(input.timeoutMs);
  input.onProgress?.(`JSON judge: checking Ollama at ${endpoint}…`);
  await preflightOllama(endpoint);

  try {
    const text = await withRetries(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await callOllamaChatOnce(
            endpoint,
            input.model,
            input.prompt,
            controller.signal,
            timeoutMs,
          );
        } finally {
          clearTimeout(timer);
        }
      },
      {
        attempts: OLLAMA_TRANSIENT_RETRIES,
        baseDelayMs: OLLAMA_RETRY_BASE_DELAY_MS,
        shouldRetry: (error) => {
          if (error instanceof RuntimeError) {
            return false;
          }
          if (error instanceof TransientHttpError) {
            return true;
          }
          return isTransientFetchError(error);
        },
        onRetry: ({ attempt, attempts, delayMs, error }) => {
          input.onProgress?.(
            `JSON judge: Ollama transient error, retrying ${attempt + 1}/${attempts} ` +
              `in ${delayMs}ms (${formatFetchFailure(error)})…`,
          );
        },
      },
    );
    return extractJsonPayload(text);
  } catch (error) {
    if (error instanceof RuntimeError || error instanceof UsageError) {
      throw error;
    }
    if (error instanceof TransientHttpError) {
      throw new RuntimeError(error.message);
    }
    if (
      (error instanceof Error && error.name === "AbortError") ||
      isUndiciRequestTimeout(error)
    ) {
      throw new RuntimeError(
        `Ollama request timed out after ${Math.round(timeoutMs / 1000)}s.`,
      );
    }
    throw new RuntimeError(
      `Cannot reach Ollama at ${endpoint}. Is the daemon running? ${formatFetchFailure(error)}`,
    );
  }
}
