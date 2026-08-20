import { describe, expect, it } from "vitest";
import { UsageError } from "../app/errors";
import { anthropicEnricher, getEnricher, ollamaEnricher } from "./index";

describe("getEnricher", () => {
  it("returns ollama enricher", () => {
    expect(getEnricher("ollama")).toBe(ollamaEnricher);
  });

  it("returns anthropic enricher", () => {
    expect(getEnricher("anthropic")).toBe(anthropicEnricher);
  });

  it("stubs openai", () => {
    expect(() => getEnricher("openai")).toThrow(UsageError);
  });
});
