import { describe, expect, it } from "vitest";
import type { TokenRiskFinding } from "../domain/types";
import { mergeFindings } from "./merge";

function finding(
  path: string,
  overrides: Partial<TokenRiskFinding> = {},
): TokenRiskFinding {
  return {
    path,
    reason: "high_risk_filetype",
    bytes: 1000,
    estTokens: 250,
    action: "excluded",
    ...overrides,
  };
}

describe("mergeFindings", () => {
  it("keeps heuristic rows and adds llm-only paths", () => {
    const heuristic = [finding("package-lock.json")];
    const llm = [
      finding("AGENTS.md", {
        reason: "redundant_instructions",
        source: "llm",
        confidence: 0.9,
        detail: "Repeats lint guidance",
      }),
    ];

    const merged = mergeFindings(heuristic, llm);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.path === "AGENTS.md")).toMatchObject({
      source: "llm",
      confidence: 0.9,
    });
  });

  it("combines metadata when both layers flag the same path", () => {
    const heuristic = [finding(".cursor/rules/testing.mdc")];
    const llm = [
      finding(".cursor/rules/testing.mdc", {
        reason: "semantic_bloat",
        source: "llm",
        confidence: 0.8,
        detail: "Duplicate testing rules",
        suggestion: {
          kind: "dedupe_rules",
          summary: "Drop the duplicated testing bullets.",
        },
      }),
    ];

    const merged = mergeFindings(heuristic, llm);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      source: "combined",
      reason: "high_risk_filetype",
      confidence: 0.8,
      detail: "Duplicate testing rules",
      suggestion: {
        kind: "dedupe_rules",
        summary: "Drop the duplicated testing bullets.",
      },
    });
  });
});
