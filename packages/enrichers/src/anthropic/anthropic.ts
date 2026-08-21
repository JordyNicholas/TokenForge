import { RuntimeError } from "../errors";
import {
  ANTHROPIC_API_VERSION,
  ANTHROPIC_BATCH_SIZE,
  ANTHROPIC_MAX_OUTPUT_TOKENS,
  DEFAULT_ANTHROPIC_ENDPOINT,
  resolveAnthropicTimeoutMs,
} from "../limits";
import { mapStructuredFindings } from "../parse";
import {
  buildEnrichmentPrompt,
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import type { EnrichmentCandidate, LlmEnricher } from "../types";

const ANTHROPIC_MESSAGES_PATH = "/messages";

type AnthropicContentBlock = {
  type?: string;
  text?: string;
};

type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
};

function messagesUrl(endpoint: string): string {
  return `${endpoint.replace(/\/$/, "")}${ANTHROPIC_MESSAGES_PATH}`;
}

function resolveApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new RuntimeError(
      "ANTHROPIC_API_KEY is not set. Export it to use --llm anthropic:<model>.",
    );
  }
  return apiKey;
}

async function callAnthropicMessages(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(messagesUrl(endpoint), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: ANTHROPIC_MAX_OUTPUT_TOKENS,
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
        `Anthropic request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as AnthropicMessagesResponse;
    const content = (payload.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("")
      .trim();

    if (payload.stop_reason === "max_tokens") {
      throw new RuntimeError(
        "Anthropic response was truncated (stop_reason: max_tokens). " +
          "Retry with fewer/smaller candidates.",
      );
    }

    if (!content) {
      throw new RuntimeError("Anthropic returned an empty response.");
    }
    return content;
  } catch (error) {
    if (error instanceof RuntimeError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new RuntimeError(
        `Anthropic request timed out after ${Math.round(timeoutMs / 1000)}s. ` +
          "Retry with a higher --llm-timeout (seconds) or scan a smaller folder.",
      );
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(
      `Cannot reach Anthropic API at ${endpoint}. ${reason}`,
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

/** Anthropic Messages API enricher (e.g. claude-sonnet-4-5). */
export const anthropicEnricher: LlmEnricher = {
  id: "anthropic",
  async enrich(input) {
    const started = Date.now();
    const endpoint = input.endpoint?.trim() || DEFAULT_ANTHROPIC_ENDPOINT;
    const timeoutMs = resolveAnthropicTimeoutMs(input.timeoutMs);
    const progress = input.onProgress;

    if (input.candidates.length === 0) {
      return {
        findings: [],
        meta: {
          backend: "anthropic",
          model: input.model,
          endpoint,
          durationMs: 0,
          candidatesSent: 0,
        },
      };
    }

    const apiKey = resolveApiKey();

    progress?.(
      `LLM enricher: sending ${input.candidates.length} candidate excerpt(s) to ` +
        "Anthropic's API (external — data leaves this machine).",
    );

    const batches = chunkCandidates(input.candidates, ANTHROPIC_BATCH_SIZE);
    const findings = [];

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index]!;
      progress?.(
        `LLM enricher: batch ${index + 1}/${batches.length} ` +
          `(${batch.length} file(s), timeout ${Math.round(timeoutMs / 1000)}s per batch)…`,
      );
      const prompt = buildEnrichmentPrompt(batch);
      const content = await callAnthropicMessages(endpoint, apiKey, input.model, prompt, timeoutMs);
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
        backend: "anthropic",
        model: input.model,
        endpoint,
        durationMs: Date.now() - started,
        candidatesSent: input.candidates.length,
      },
    };
  },
};
