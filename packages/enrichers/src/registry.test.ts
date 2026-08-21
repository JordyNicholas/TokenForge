import { describe, expect, it } from "vitest";
import { anthropicEnricher, codexEnricher, getEnricher, ollamaEnricher } from "./index";

describe("getEnricher", () => {
  it("returns ollama enricher", () => {
    expect(getEnricher("ollama")).toBe(ollamaEnricher);
  });

  it("returns anthropic enricher", () => {
    expect(getEnricher("anthropic")).toBe(anthropicEnricher);
  });

  it("returns Codex CLI enricher", () => {
    expect(getEnricher("codex")).toBe(codexEnricher);
  });
});
