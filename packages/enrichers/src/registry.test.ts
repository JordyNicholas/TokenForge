import { describe, expect, it } from "vitest";
import {
  anthropicEnricher,
  claudeCodeEnricher,
  codexEnricher,
  geminiCliEnricher,
  getEnricher,
  ollamaEnricher,
} from "./index";

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

  it("returns Claude Code CLI enricher", () => {
    expect(getEnricher("claude-code")).toBe(claudeCodeEnricher);
    // The two Anthropic paths must stay distinct: one bills an API key, the
    // other rides the CLI's subscription login.
    expect(getEnricher("claude-code")).not.toBe(anthropicEnricher);
  });

  it("returns Gemini CLI enricher", () => {
    expect(getEnricher("gemini-cli")).toBe(geminiCliEnricher);
  });
});
