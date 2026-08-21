import { describe, expect, it } from "vitest";
import {
  architectureForTeam,
  tokensByArchitecture,
  type ArchitectureStyle,
} from "./architecture";
import { compactionAdvice, routingAdvice } from "./advisory";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import { projectSavings } from "./calculator";
import {
  boardScopeBase,
  parseTeamIdFromPath,
  boardViewSuffix,
} from "./teamScope";
import { isUsageMetrics, usageForTeam } from "./usage";

describe("teamScope", () => {
  it("parses team id from board paths", () => {
    expect(parseTeamIdFromPath("/board/combined/team/payments-platform")).toBe(
      "payments-platform",
    );
    expect(
      parseTeamIdFromPath("/board/llm/team/checkout/heatmap"),
    ).toBe("checkout");
    expect(parseTeamIdFromPath("/board/combined")).toBeNull();
  });

  it("builds scope bases and view suffixes", () => {
    expect(boardScopeBase("combined", null)).toBe("/board/combined");
    expect(boardScopeBase("heuristic", "data-eng")).toBe(
      "/board/heuristic/team/data-eng",
    );
    expect(boardViewSuffix("/board/combined/team/checkout/findings")).toBe(
      "/findings",
    );
    expect(boardViewSuffix("/board/combined/heatmap")).toBe("/heatmap");
  });
});

describe("architecture", () => {
  it("rolls up saved tokens by estate style", () => {
    const architectures: Record<string, ArchitectureStyle> = {
      a: "microservices",
      b: "serverless",
      c: "microservices",
    };
    const buckets = tokensByArchitecture(
      [
        {
          source: "cli",
          timestamp: "2026-01-01T00:00:00.000Z",
          repo: "r1",
          team: "a",
          provider: "generic",
          findings: [],
          totals: { beforeTokens: 100, afterTokens: 40, savedTokens: 60 },
        },
        {
          source: "cli",
          timestamp: "2026-01-01T00:00:00.000Z",
          repo: "r2",
          team: "b",
          provider: "generic",
          findings: [],
          totals: { beforeTokens: 50, afterTokens: 10, savedTokens: 40 },
        },
        {
          source: "cli",
          timestamp: "2026-01-01T00:00:00.000Z",
          repo: "c",
          team: "c",
          provider: "generic",
          findings: [],
          totals: { beforeTokens: 20, afterTokens: 5, savedTokens: 15 },
        },
      ],
      architectures,
    );
    expect(architectureForTeam("a", architectures)).toBe("microservices");
    expect(buckets.find((b) => b.architecture === "microservices")?.savedTokens).toBe(
      75,
    );
    expect(buckets.find((b) => b.architecture === "serverless")?.teams).toBe(1);
  });
});

describe("usage", () => {
  it("validates and slices usage metrics", () => {
    const usage = {
      source: "demo" as const,
      providerLabel: "demo",
      period: "2026-08",
      teams: [{ team: "checkout", creditsUsed: 10, estimatedUsd: 2 }],
      totals: { creditsUsed: 10, estimatedUsd: 2 },
    };
    expect(isUsageMetrics(usage)).toBe(true);
    expect(usageForTeam(usage, null)?.creditsUsed).toBe(10);
    expect(usageForTeam(usage, "checkout")?.estimatedUsd).toBe(2);
    expect(usageForTeam(usage, "missing")).toBeNull();
  });
});

describe("advisory", () => {
  it("warns on heavy context + chat volume", () => {
    const tip = compactionAdvice({
      beforeTokens: 300_000,
      msgsPerDevPerDay: 50,
      tokensPerMessage: 9000,
    });
    expect(tip.severity).toBe("warning");
  });

  it("suggests lowering premium when wastey", () => {
    const assumptions = {
      ...DEFAULT_ASSUMPTIONS,
      premiumShare: 0.6,
      realizedWasteShare: 0.3,
    };
    const projection = projectSavings(
      { beforeTokens: 1_000_000, afterTokens: 700_000, savedTokens: 300_000 },
      assumptions,
    );
    const tip = routingAdvice(assumptions, projection);
    expect(tip.suggestedPremiumShare).toBeLessThan(assumptions.premiumShare);
  });
});
