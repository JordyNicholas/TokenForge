import { describe, expect, it } from "vitest";
import {
  ANTHROPIC_MAX_OUTPUT_TOKENS,
  DEFAULT_CODEX_TIMEOUT_MS,
  DEFAULT_OLLAMA_TIMEOUT_MS,
  MAX_CANDIDATE_BYTES,
  MAX_ENRICHMENT_CANDIDATES,
  MAX_LLM_EXCERPT_CHARS,
  UNBOUNDED_EXCERPT_CHARS,
  parseLlmTimeoutSeconds,
  resolveCodexTimeoutMs,
  resolveOllamaTimeoutMs,
} from "./limits";

describe("resolveOllamaTimeoutMs", () => {
  it("defaults to 15 minutes per batch", () => {
    expect(resolveOllamaTimeoutMs()).toBe(DEFAULT_OLLAMA_TIMEOUT_MS);
    expect(DEFAULT_OLLAMA_TIMEOUT_MS).toBe(900_000);
  });

  it("parses CLI seconds override", () => {
    expect(parseLlmTimeoutSeconds("1200")).toBe(1_200_000);
    expect(resolveOllamaTimeoutMs(1_200_000)).toBe(1_200_000);
  });
});

describe("resolveCodexTimeoutMs", () => {
  it("defaults to two minutes per batch", () => {
    expect(resolveCodexTimeoutMs()).toBe(DEFAULT_CODEX_TIMEOUT_MS);
    expect(DEFAULT_CODEX_TIMEOUT_MS).toBe(120_000);
  });

  it("accepts the shared CLI timeout override", () => {
    expect(resolveCodexTimeoutMs(parseLlmTimeoutSeconds("30"))).toBe(30_000);
  });
});

describe("prompt and response budgets", () => {
  it("keeps the local trim well under the read cap", () => {
    // The local budget is a prompt-side trim; MAX_CANDIDATE_BYTES is the read
    // boundary. If they ever met, the trim would stop doing anything.
    expect(MAX_LLM_EXCERPT_CHARS).toBeLessThan(MAX_CANDIDATE_BYTES);
  });

  it("leaves large-context backends untrimmed", () => {
    expect(UNBOUNDED_EXCERPT_CHARS).toBe(Number.POSITIVE_INFINITY);
    expect(MAX_CANDIDATE_BYTES).toBeLessThan(UNBOUNDED_EXCERPT_CHARS);
  });

  it("sizes the Anthropic response for a full candidate set, not one batch", () => {
    // ~400 output tokens per rich finding, and the cap is 30 candidates, so a
    // batch-sized ceiling turns a good scan into a truncation error.
    const worstCaseFindings = MAX_ENRICHMENT_CANDIDATES;
    expect(ANTHROPIC_MAX_OUTPUT_TOKENS).toBeGreaterThan(worstCaseFindings * 400);
  });
});
