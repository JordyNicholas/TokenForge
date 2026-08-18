import { describe, expect, it } from "vitest";
import { UsageError } from "../app/errors";
import { getEnricher, ollamaEnricher } from "./index";

describe("getEnricher", () => {
  it("returns ollama enricher", () => {
    expect(getEnricher("ollama")).toBe(ollamaEnricher);
  });

  it("stubs openai and anthropic", () => {
    expect(() => getEnricher("openai")).toThrow(UsageError);
    expect(() => getEnricher("anthropic")).toThrow(UsageError);
  });
});
