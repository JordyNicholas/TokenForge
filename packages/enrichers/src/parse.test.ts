import { describe, expect, it } from "vitest";
import { parseLlmSpec } from "./parse";

describe("parseLlmSpec", () => {
  it("defaults to noop when omitted", () => {
    expect(parseLlmSpec(undefined)).toEqual({ backend: "noop", model: "none" });
  });

  it("parses backend and model", () => {
    expect(parseLlmSpec("ollama:qwen2.5-coder:7b")).toEqual({
      backend: "ollama",
      model: "qwen2.5-coder:7b",
    });
  });

  it("uses the Codex-configured model unless one is explicitly provided", () => {
    expect(parseLlmSpec("codex")).toEqual({
      backend: "codex",
      model: "default",
    });
    expect(parseLlmSpec("codex:gpt-5.6-sol")).toEqual({
      backend: "codex",
      model: "gpt-5.6-sol",
    });
  });

  it("does not expose the removed OpenAI HTTP backend", () => {
    expect(() => parseLlmSpec("openai:gpt-5.6-sol")).toThrow(
      'Unknown LLM backend "openai"',
    );
  });
});
