import { describe, expect, it } from "vitest";
import {
  attentionPriorityScore,
  buildHeuristicAttentionSet,
  enrichmentTierForBackend,
} from "./attention";
import type { RiskAssessment } from "../domain/types";

function assessment(path: string, estTokens: number): RiskAssessment {
  return {
    path,
    bytes: estTokens * 4,
    estTokens,
    fileClass: "unknown",
    atRisk: false,
    score: 0,
  };
}

describe("buildHeuristicAttentionSet", () => {
  it("returns full set for vendor tier", () => {
    const assessments = Array.from({ length: 40 }, (_, index) =>
      assessment(`src/file-${index}.ts`, 100 + index),
    );
    assessments.push(assessment("AGENTS.md", 900));
    const local = buildHeuristicAttentionSet(
      { assessments, findings: [{ path: "README.md", reason: "semantic_bloat", bytes: 1, estTokens: 50, action: "kept" }] },
      { tier: "local", maxCandidates: 5 },
    );
    const vendor = buildHeuristicAttentionSet(
      { assessments, findings: [{ path: "README.md", reason: "semantic_bloat", bytes: 1, estTokens: 50, action: "kept" }] },
      { tier: "vendor" },
    );
    expect(local.length).toBe(5);
    expect(vendor.length).toBeGreaterThan(5);
  });

  it("ranks instruction paths ahead of generic source files", () => {
    const assessments = [
      assessment("src/huge.ts", 5000),
      assessment("AGENTS.md", 200),
    ];
    const ranked = buildHeuristicAttentionSet(
      { assessments },
      { tier: "local", maxCandidates: 1 },
    );
    expect(ranked[0]?.path).toBe("AGENTS.md");
  });
});

describe("enrichmentTierForBackend", () => {
  it("marks ollama as local and cursor-cli as vendor", () => {
    expect(enrichmentTierForBackend("ollama")).toBe("local");
    expect(enrichmentTierForBackend("cursor-cli")).toBe("vendor");
  });
});

describe("attentionPriorityScore", () => {
  it("scores instruction and budget paths higher", () => {
    const instruction = assessment("AGENTS.md", 100);
    const source = assessment("src/a.ts", 100);
    const scoreInstruction = attentionPriorityScore({
      assessment: instruction,
      findingPaths: new Set(),
      budgetPaths: new Set(["AGENTS.md"]),
    });
    const scoreSource = attentionPriorityScore({
      assessment: source,
      findingPaths: new Set(),
      budgetPaths: new Set(),
    });
    expect(scoreInstruction).toBeGreaterThan(scoreSource);
  });
});
