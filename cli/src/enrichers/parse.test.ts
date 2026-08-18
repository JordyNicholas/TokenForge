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
});
