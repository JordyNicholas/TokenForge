import { describe, expect, it } from "vitest";
import type { TokenRiskFinding } from "../domain/types";
import { explainFinding } from "./explain";
import {
  isFindingSuggestion,
  resolveSuggestion,
  templateSuggestion,
} from "./suggest";

function finding(overrides: Partial<TokenRiskFinding> = {}): TokenRiskFinding {
  return {
    path: "package-lock.json",
    reason: "high_risk_filetype",
    bytes: 4000,
    estTokens: 1000,
    action: "excluded",
    source: "heuristic",
    ...overrides,
  };
}

describe("explainFinding", () => {
  it("explains lockfiles without a model", () => {
    const result = explainFinding(finding());
    expect(result.explanation).toMatch(/lockfile/i);
    expect(result.detail).toBeUndefined();
  });

  it("attaches LLM detail when present", () => {
    const result = explainFinding(
      finding({
        path: "AGENTS.md",
        reason: "redundant_instructions",
        source: "llm",
        detail: "Repeats lint rules already in README.md",
      }),
    );
    expect(result.explanation).toMatch(/duplicate/i);
    expect(result.detail).toBe("Repeats lint rules already in README.md");
  });
});

describe("templateSuggestion", () => {
  it("keeps lockfiles on exclude-from-context", () => {
    expect(templateSuggestion(finding()).kind).toBe("exclude_from_context");
  });

  it("uses review for kept rows", () => {
    expect(templateSuggestion(finding({ action: "kept" })).kind).toBe("review");
  });

  it("dedupes redundant instruction files", () => {
    const suggestion = templateSuggestion(
      finding({
        path: "AGENTS.md",
        reason: "redundant_instructions",
        source: "llm",
      }),
    );
    expect(suggestion.kind).toBe("dedupe_rules");
    expect(suggestion.summary).toMatch(/duplicate/i);
    expect(suggestion.summary).not.toMatch(/rewrite the service|split the app/i);
  });
});

describe("resolveSuggestion", () => {
  it("prefers a persisted LLM suggestion", () => {
    const resolved = resolveSuggestion(
      finding({
        suggestion: {
          kind: "trim_instructions",
          summary: "Drop the duplicated testing bullets.",
        },
      }),
    );
    expect(resolved).toEqual({
      kind: "trim_instructions",
      summary: "Drop the duplicated testing bullets.",
    });
  });

  it("rejects unknown suggestion shapes", () => {
    expect(isFindingSuggestion({ kind: "rewrite_architecture", summary: "x" })).toBe(
      false,
    );
    expect(isFindingSuggestion({ kind: "review", summary: "  " })).toBe(false);
  });
});
