import { describe, expect, it } from "vitest";
import {
  DEFAULT_OLLAMA_TIMEOUT_MS,
  parseLlmTimeoutSeconds,
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
