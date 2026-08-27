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

  it("uses the Claude-Code-configured model unless one is explicitly provided", () => {
    expect(parseLlmSpec("claude-code")).toEqual({
      backend: "claude-code",
      model: "default",
    });
    // The hyphen in the backend id must not be read as the model separator —
    // the split is on the first colon, not the first non-word character.
    expect(parseLlmSpec("claude-code:claude-opus-5")).toEqual({
      backend: "claude-code",
      model: "claude-opus-5",
    });
  });

  it("uses the Gemini-CLI-configured model unless one is explicitly provided", () => {
    expect(parseLlmSpec("gemini-cli")).toEqual({
      backend: "gemini-cli",
      model: "default",
    });
    expect(parseLlmSpec("gemini-cli:gemini-2.5-flash")).toEqual({
      backend: "gemini-cli",
      model: "gemini-2.5-flash",
    });
  });

  it("does not confuse claude-code with the API-key anthropic backend", () => {
    expect(parseLlmSpec("anthropic:claude-opus-5")).toEqual({
      backend: "anthropic",
      model: "claude-opus-5",
    });
    expect(() => parseLlmSpec("claude:claude-opus-5")).toThrow(
      'Unknown LLM backend "claude"',
    );
  });

  it("points a bare claude at the claude-code backend", () => {
    // Observed while testing the real CLI: `--llm claude` is the natural typo,
    // and it lands on the no-colon branch, which never sees the backend list.
    expect(() => parseLlmSpec("claude")).toThrow('Did you mean "claude-code"?');
    expect(() => parseLlmSpec("nonsense")).toThrow("bare CLI backend");
    expect(() => parseLlmSpec("nonsense")).not.toThrow("Did you mean");
  });

  it("does not expose the removed OpenAI HTTP backend", () => {
    expect(() => parseLlmSpec("openai:gpt-5.6-sol")).toThrow(
      'Unknown LLM backend "openai"',
    );
  });
});
