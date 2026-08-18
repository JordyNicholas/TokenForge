import { RuntimeError } from "../../app/errors";
import {
  DEFAULT_OLLAMA_ENDPOINT,
  OLLAMA_BATCH_SIZE,
  resolveOllamaTimeoutMs,
} from "../limits";
import { mapStructuredFindings } from "../parse";
import {
  buildEnrichmentPrompt,
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import type { EnrichmentCandidate, LlmEnricher } from "../types";

const OLLAMA_CHAT_PATH = "/api/chat";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

function chatUrl(endpoint: string): string {
  return `${endpoint.replace(/\/$/, "")}${OLLAMA_CHAT_PATH}`;
}

async function callOllamaChat(
  endpoint: string,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(chatUrl(endpoint), {
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
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new RuntimeError(
        `Ollama request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const content = payload.message?.content?.trim();
    if (!content) {
      throw new RuntimeError("Ollama returned an empty response.");
    }
    return content;
  } catch (error) {
    if (error instanceof RuntimeError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new RuntimeError(
        `Ollama request timed out after ${Math.round(timeoutMs / 1000)}s. ` +
          "On slower hardware, retry with a higher --llm-timeout (seconds) or scan a smaller folder.",
      );
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(
      `Cannot reach Ollama at ${endpoint}. Is the daemon running? ${reason}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

function chunkCandidates(
  candidates: readonly EnrichmentCandidate[],
  size: number,
): EnrichmentCandidate[][] {
  const batches: EnrichmentCandidate[][] = [];
  for (let index = 0; index < candidates.length; index += size) {
    batches.push(candidates.slice(index, index + size));
  }
  return batches;
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

    const batches = chunkCandidates(input.candidates, OLLAMA_BATCH_SIZE);
    const findings = [];

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index]!;
      progress?.(
        `LLM enricher: batch ${index + 1}/${batches.length} ` +
          `(${batch.length} file(s), timeout ${Math.round(timeoutMs / 1000)}s per batch)…`,
      );
      const prompt = buildEnrichmentPrompt(batch);
      const content = await callOllamaChat(endpoint, input.model, prompt, timeoutMs);
      const payload = extractJsonPayload(content);
      const structured = parseStructuredFindings(payload, batch);
      findings.push(...mapStructuredFindings(structured, batch));
    }

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
