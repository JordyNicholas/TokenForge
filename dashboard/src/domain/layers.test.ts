import { describe, expect, it } from "vitest";
import {
  aggregateLayerTotals,
  parseBoardLayerFromPath,
  reportHasHybridLlm,
  reportsForLayer,
} from "./layers";

const sampleReport = {
  source: "cli" as const,
  timestamp: "2026-08-18T00:00:00.000Z",
  repo: "demo",
  team: "alpha",
  provider: "generic" as const,
  findings: [
    {
      path: "lock.json",
      reason: "high_risk_filetype" as const,
      bytes: 400,
      estTokens: 100,
      action: "excluded" as const,
      source: "heuristic" as const,
    },
    {
      path: "AGENTS.md",
      reason: "redundant_instructions" as const,
      bytes: 800,
      estTokens: 200,
      action: "excluded" as const,
      source: "llm" as const,
    },
  ],
  totals: { beforeTokens: 1000, afterTokens: 700, savedTokens: 300 },
  layers: {
    heuristic: {
      findings: [
        {
          path: "lock.json",
          reason: "high_risk_filetype" as const,
          bytes: 400,
          estTokens: 100,
          action: "excluded" as const,
          source: "heuristic" as const,
        },
      ],
      totals: { beforeTokens: 1000, afterTokens: 900, savedTokens: 100 },
    },
    llm: {
      findings: [
        {
          path: "AGENTS.md",
          reason: "redundant_instructions" as const,
          bytes: 800,
          estTokens: 200,
          action: "excluded" as const,
          source: "llm" as const,
        },
      ],
      totals: { beforeTokens: 200, afterTokens: 0, savedTokens: 200 },
    },
    combined: {
      findings: [
        {
          path: "lock.json",
          reason: "high_risk_filetype" as const,
          bytes: 400,
          estTokens: 100,
          action: "excluded" as const,
          source: "heuristic" as const,
        },
        {
          path: "AGENTS.md",
          reason: "redundant_instructions" as const,
          bytes: 800,
          estTokens: 200,
          action: "excluded" as const,
          source: "llm" as const,
        },
      ],
      totals: { beforeTokens: 1000, afterTokens: 700, savedTokens: 300 },
    },
  },
};

describe("dashboard layer helpers", () => {
  it("parses board layer from pathname", () => {
    expect(parseBoardLayerFromPath("/board/heuristic")).toBe("heuristic");
    expect(parseBoardLayerFromPath("/board/llm/offenders")).toBe("llm");
    expect(parseBoardLayerFromPath("/assumptions")).toBe("combined");
  });

  it("detects hybrid LLM reports without findings", () => {
    expect(
      reportHasHybridLlm({
        ...sampleReport,
        findings: [],
        layers: undefined,
        scan: {
          mode: "hybrid",
          llm: {
            backend: "ollama",
            model: "qwen2.5-coder:7b",
            durationMs: 1000,
            candidatesSent: 3,
          },
        },
      }),
    ).toBe(true);
  });

  it("projects heuristic and llm boards separately", () => {
    const heuristic = reportsForLayer([sampleReport], "heuristic")[0];
    const llm = reportsForLayer([sampleReport], "llm")[0];

    expect(heuristic.findings).toHaveLength(1);
    expect(llm.findings).toHaveLength(1);
    expect(heuristic.totals.savedTokens).toBe(100);
    expect(llm.totals.savedTokens).toBe(200);
  });

  it("aggregates totals per board", () => {
    const totals = aggregateLayerTotals([sampleReport], "combined");
    expect(totals.savedTokens).toBe(300);
  });
});
