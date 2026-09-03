import { describe, expect, it } from "vitest";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { hybridFromExistingReport } from "./hybridPreserve";

function hybridReport(): TokenRiskReport {
  return {
    source: "extension",
    timestamp: "2026-09-03T22:00:00.000Z",
    repo: "TokenForge",
    team: "default",
    provider: "cursor",
    findings: [
      {
        path: "AGENTS.md",
        reason: "redundant_instructions",
        bytes: 800,
        estTokens: 200,
        action: "excluded",
        source: "llm",
      },
    ],
    totals: { beforeTokens: 200, afterTokens: 0, savedTokens: 200 },
    layers: {
      heuristic: {
        findings: [],
        totals: { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
      },
      llm: {
        findings: [
          {
            path: "AGENTS.md",
            reason: "redundant_instructions",
            bytes: 800,
            estTokens: 200,
            action: "excluded",
            source: "llm",
          },
        ],
        totals: { beforeTokens: 400, afterTokens: 200, savedTokens: 200 },
      },
      combined: {
        findings: [
          {
            path: "AGENTS.md",
            reason: "redundant_instructions",
            bytes: 800,
            estTokens: 200,
            action: "excluded",
            source: "llm",
          },
        ],
        totals: { beforeTokens: 200, afterTokens: 0, savedTokens: 200 },
      },
    },
    scan: {
      mode: "hybrid",
      llm: {
        backend: "ollama",
        model: "qwen2.5-coder:3b",
        durationMs: 2590_000,
        candidatesSent: 3,
      },
    },
    activePaths: ["AGENTS.md"],
  };
}

describe("hybridFromExistingReport", () => {
  it("recovers LLM findings and meta for auto-export preserve", () => {
    const hybrid = hybridFromExistingReport(hybridReport());
    expect(hybrid?.llmFindings).toHaveLength(1);
    expect(hybrid?.llmFindings[0]?.path).toBe("AGENTS.md");
    expect(hybrid?.llmMeta).toMatchObject({
      backend: "ollama",
      model: "qwen2.5-coder:3b",
      candidatesSent: 3,
    });
    expect(hybrid?.llmCandidateTokens).toBe(400);
  });

  it("returns undefined for heuristic-only reports", () => {
    expect(
      hybridFromExistingReport({
        source: "extension",
        timestamp: "2026-09-03T22:00:00.000Z",
        repo: "TokenForge",
        team: "default",
        provider: "cursor",
        findings: [],
        totals: { beforeTokens: 76, afterTokens: 76, savedTokens: 0 },
        activePaths: [".tokenforge/last-scan.json"],
      }),
    ).toBeUndefined();
  });
});
