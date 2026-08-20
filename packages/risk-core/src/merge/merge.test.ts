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

  it("sorts merged findings by estTokens desc, then path asc on ties", () => {
    const heuristic = [
      finding("b.json", { estTokens: 100 }),
      finding("a.json", { estTokens: 100 }),
    ];
    const llm = [finding("z.md", { source: "llm", estTokens: 500 })];

    const merged = mergeFindings(heuristic, llm);

    expect(merged.map((item) => item.path)).toEqual(["z.md", "a.json", "b.json"]);
  });

  it("returns an empty array when both inputs are empty", () => {
    expect(mergeFindings([], [])).toEqual([]);
  });

  it("returns heuristic findings unchanged (aside from default source) when llm is empty", () => {
    const heuristic = [finding("package-lock.json")];

    const merged = mergeFindings(heuristic, []);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ path: "package-lock.json", source: "heuristic" });
  });

  it("returns llm-only findings unchanged when heuristic is empty", () => {
    const llm = [finding("AGENTS.md", { source: "llm", confidence: 0.7 })];

    const merged = mergeFindings([], llm);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ path: "AGENTS.md", source: "llm", confidence: 0.7 });
  });

  it("keeps existing confidence/detail/suggestion when the llm row on the same path omits them", () => {
    const heuristic = [
      finding("AGENTS.md", {
        confidence: 0.6,
        detail: "Existing detail",
        suggestion: { kind: "review", summary: "Existing summary" },
      }),
    ];
    const llm = [finding("AGENTS.md", { source: "llm", reason: "semantic_bloat" })];

    const merged = mergeFindings(heuristic, llm);

    expect(merged[0]).toMatchObject({
      source: "combined",
      confidence: 0.6,
      detail: "Existing detail",
      suggestion: { kind: "review", summary: "Existing summary" },
    });
  });
});
