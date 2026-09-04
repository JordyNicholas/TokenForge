import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import { buildProveSummaryMarkdown } from "./proveSummary";
import type { UsageMetrics } from "./usage";
import { buildVarianceBoard } from "./varianceBoard";

const baselineUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot",
  period: "2026-08",
  teams: [{ team: "checkout", creditsUsed: 8200, estimatedUsd: 1230 }],
  totals: { creditsUsed: 8200, estimatedUsd: 1230 },
};

const afterUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot",
  period: "2026-09",
  teams: [{ team: "checkout", creditsUsed: 6400, estimatedUsd: 960 }],
  totals: { creditsUsed: 6400, estimatedUsd: 960 },
};

const reports = [
  {
    team: "checkout",
    repo: "checkout-svc",
    totals: { beforeTokens: 500_000, afterTokens: 400_000, savedTokens: 100_000 },
  },
] as const;

describe("buildProveSummaryMarkdown", () => {
  it("includes variance KPIs, cohort honesty, and freeze note", () => {
    const board = buildVarianceBoard({
      baselineUsage,
      afterUsage,
      reports: [...reports],
      liveAssumptions: DEFAULT_ASSUMPTIONS,
    });
    const md = buildProveSummaryMarkdown({
      board,
      fixOnTeams: ["checkout"],
      assumptionsFrozen: DEFAULT_ASSUMPTIONS,
      generatedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(md).toMatch(/TokenForge Prove summary/);
    expect(md).toMatch(/2026-08 → 2026-09/);
    expect(md).toMatch(/Estimated reduction/);
    expect(md).toMatch(/no control cohort|weak evidence/i);
    expect(md).toMatch(/not proof|not an invoice causation/i);
  });

  it("warns when assumptions are live", () => {
    const board = buildVarianceBoard({
      baselineUsage,
      afterUsage,
      reports: [...reports],
      liveAssumptions: DEFAULT_ASSUMPTIONS,
    });
    const md = buildProveSummaryMarkdown({
      board,
      fixOnTeams: [],
      assumptionsFrozen: null,
    });
    expect(md).toMatch(/live \(not frozen/);
  });
});
