import { RuntimeError } from "../../app/errors";
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
  OLLAMA_BATCH_SIZE,
  OLLAMA_PREFLIGHT_TIMEOUT_MS,
  OLLAMA_RETRY_BASE_DELAY_MS,
  OLLAMA_TRANSIENT_RETRIES,
  resolveOllamaTimeoutMs,
} from "../limits";
import { runMultiPassEnrich } from "../multipass";
import { mapStructuredFindings } from "../parse";
import type { LlmEnricher } from "../types";

const OLLAMA_CHAT_PATH = "/api/chat";
const OLLAMA_TAGS_PATH = "/api/tags";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

function baseUrl(endpoint: string): string {
  return endpoint.replace(/\/$/, "");
}

function chatUrl(endpoint: string): string {
  return `${baseUrl(endpoint)}${OLLAMA_CHAT_PATH}`;
}

function tagsUrl(endpoint: string): string {
  return `${baseUrl(endpoint)}${OLLAMA_TAGS_PATH}`;
}

function cannotReachMessage(endpoint: string, error: unknown): string {
  return (
    `Cannot reach Ollama at ${endpoint}. Is the daemon running? ` +
    formatFetchFailure(error)
  );
}

function timeoutMessage(timeoutMs: number): string {
  return (
    `Ollama request timed out after ${Math.round(timeoutMs / 1000)}s. ` +
    "On slower hardware, retry with a higher --llm-timeout (seconds) or scan a smaller folder."
  );
}

function shouldRetryOllama(error: unknown): boolean {
  if (error instanceof RuntimeError) {
    return false;
  }
  if (error instanceof TransientHttpError) {
    return true;
  }
  return isTransientFetchError(error);
}

async function preflightOllama(endpoint: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    OLLAMA_PREFLIGHT_TIMEOUT_MS,
  );

  try {
    const response = await fetchWithTimeout(
      tagsUrl(endpoint),
      {
        method: "GET",
        signal: controller.signal,
      },
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
    throw new RuntimeError(cannotReachMessage(endpoint, error));
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
    chatUrl(endpoint),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
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

async function callOllamaChat(
  endpoint: string,
  model: string,
  prompt: string,
  timeoutMs: number,
  onProgress?: (message: string) => void,
): Promise<string> {
  try {
    return await withRetries(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await callOllamaChatOnce(
            endpoint,
            model,
            prompt,
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
        shouldRetry: shouldRetryOllama,
        onRetry: ({ attempt, attempts, delayMs, error }) => {
          onProgress?.(
            `LLM enricher: Ollama transient error, retrying ${attempt + 1}/${attempts} ` +
              `in ${delayMs}ms (${formatFetchFailure(error)})…`,
          );
        },
      },
    );
  } catch (error) {
    if (error instanceof RuntimeError) {
      throw error;
    }
    if (error instanceof TransientHttpError) {
      throw new RuntimeError(error.message);
    }
    if (
      (error instanceof Error && error.name === "AbortError") ||
      isUndiciRequestTimeout(error)
    ) {
      throw new RuntimeError(timeoutMessage(timeoutMs));
    }
    throw new RuntimeError(cannotReachMessage(endpoint, error));
  }
}

/** Local Ollama enricher (e.g. qwen2.5-coder:7b). */
export const ollamaEnricher: LlmEnricher = {
  id: "ollama",
  async enrich(input) {
    const started = Date.now();
    const endpoint = input.endpoint?.trim() || DEFAULT_OLLAMA_ENDPOINT;
    const timeoutMs = resolveOllamaTimeoutMs(input.timeoutMs);
    const progress = input.onProgress;

    if (input.candidates.length === 0) {
      return {
        findings: [],
        meta: {
          backend: "ollama",
          model: input.model,
          endpoint,
          durationMs: 0,
          candidatesSent: 0,
        },
      };
    }

    progress?.(`LLM enricher: checking Ollama at ${endpoint}…`);
    await preflightOllama(endpoint);

    progress?.(
      `LLM enricher: multi-pass Ollama (${input.candidates.length} candidate(s), ` +
        `timeout ${Math.round(timeoutMs / 1000)}s per request)…`,
    );

    const structured = await runMultiPassEnrich({
      candidates: input.candidates,
      batchSize: OLLAMA_BATCH_SIZE,
      onProgress: progress,
      callModel: (prompt) =>
        callOllamaChat(endpoint, input.model, prompt, timeoutMs, progress),
    });
    const findings = mapStructuredFindings(structured, input.candidates);

    progress?.(
      `LLM enricher: finished in ${Math.round((Date.now() - started) / 1000)}s ` +
        `(${findings.length} finding(s)).`,
    );

    return {
      findings,
      meta: {
        backend: "ollama",
        model: input.model,
        endpoint,
        durationMs: Date.now() - started,
        candidatesSent: input.candidates.length,
      },
    };
  },
};
