import { describe, expect, it } from "vitest";
import type { RiskAssessment, TokenRiskFinding } from "../domain/types";
import { buildScanLayers, tallyLlmTotals } from "./totals";
import { resolveScanLayer, resolveScanLayers } from "./resolve";

function assessment(path: string, estTokens: number, atRisk: boolean): RiskAssessment {
  return {
    path,
    bytes: estTokens * 4,
    estTokens,
    fileClass: "unknown",
    score: atRisk ? 80 : 10,
    atRisk,
    reasons: atRisk ? ["oversized"] : [],
  };
}

function finding(path: string, estTokens: number, source?: TokenRiskFinding["source"]): TokenRiskFinding {
  return {
    path,
    reason: "oversized",
    bytes: estTokens * 4,
    estTokens,
    action: "excluded",
    source,
  };
}

describe("buildScanLayers", () => {
  it("keeps heuristic and llm findings separate", () => {
    const assessments = [
      assessment("lock.json", 1000, true),
      assessment("AGENTS.md", 500, false),
    ];
    const layers = buildScanLayers({
      assessments,
      heuristicFindings: [finding("lock.json", 1000, "heuristic")],
      llmFindings: [finding("AGENTS.md", 500, "llm")],
      llmCandidateTokens: 500,
    });

    expect(layers.heuristic.findings).toHaveLength(1);
    expect(layers.llm.findings).toHaveLength(1);
    expect(layers.combined.findings).toHaveLength(2);
    expect(layers.llm.totals.savedTokens).toBe(500);
  });
});

describe("resolveScanLayers", () => {
  it("reads explicit layers when present", () => {
    const report = {
      source: "cli" as const,
      timestamp: "2026-08-18T00:00:00.000Z",
      repo: "demo",
      team: "local",
      provider: "generic" as const,
      findings: [finding("a", 100)],
      totals: { beforeTokens: 100, afterTokens: 0, savedTokens: 100 },
      layers: buildScanLayers({
        assessments: [assessment("a", 100, true)],
        heuristicFindings: [finding("a", 100, "heuristic")],
        llmFindings: [],
      }),
    };

    expect(resolveScanLayer(report, "heuristic").findings).toHaveLength(1);
    expect(resolveScanLayers(report).llm.findings).toHaveLength(0);
  });

  it("synthesizes llm totals from legacy findings", () => {
    const llmFinding = finding("AGENTS.md", 200, "llm");
    const report = {
      source: "cli" as const,
      timestamp: "2026-08-18T00:00:00.000Z",
      repo: "demo",
      team: "local",
      provider: "generic" as const,
      findings: [llmFinding],
      totals: { beforeTokens: 1000, afterTokens: 800, savedTokens: 200 },
    };

    expect(resolveScanLayer(report, "llm").findings).toEqual([llmFinding]);
    expect(tallyLlmTotals(0, [llmFinding]).savedTokens).toBe(200);
  });
});
