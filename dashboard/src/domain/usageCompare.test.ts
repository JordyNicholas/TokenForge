import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import { compareUsagePeriods, usagePeriodSlice } from "./usageCompare";
import type { UsageMetrics } from "./usage";

const baselineUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot (sanitized FinOps export)",
  period: "2026-08",
  teams: [
    { team: "checkout", creditsUsed: 8200, estimatedUsd: 1230 },
    { team: "payments-platform", creditsUsed: 12400, estimatedUsd: 1860 },
  ],
  totals: { creditsUsed: 20600, estimatedUsd: 3090 },
};

const afterUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot (sanitized FinOps export)",
  period: "2026-09",
  teams: [
    { team: "checkout", creditsUsed: 6400, estimatedUsd: 960 },
    { team: "payments-platform", creditsUsed: 9800, estimatedUsd: 1470 },
  ],
  totals: { creditsUsed: 16200, estimatedUsd: 2430 },
};

describe("usagePeriodSlice", () => {
  it("returns BU totals or a team row", () => {
    expect(usagePeriodSlice(baselineUsage, null)?.estimatedUsd).toBe(3090);
    expect(usagePeriodSlice(baselineUsage, "checkout")?.creditsUsed).toBe(8200);
    expect(usagePeriodSlice(baselineUsage, "missing")).toBeNull();
  });
});

describe("compareUsagePeriods", () => {
  it("shows estimated reduction, actual billed change, and variance", () => {
    const compare = compareUsagePeriods({
      baselineUsage,
      afterUsage,
      teamId: null,
      baselineTotals: {
        beforeTokens: 1_000_000,
        afterTokens: 700_000,
        savedTokens: 300_000,
      },
      assumptions: DEFAULT_ASSUMPTIONS,
    });
    expect(compare).not.toBeNull();
    expect(compare!.actualBilledChange).toBe(660);
    expect(compare!.estimatedUsdReduction).toBeGreaterThan(0);
    expect(compare!.varianceUsd).toBe(
      compare!.actualBilledChange - compare!.estimatedUsdReduction,
    );
    expect(compare!.periodMismatch).toBe(true);
    expect(compare!.providerMismatch).toBe(false);
  });

  it("scopes actual billed change to a team", () => {
    const compare = compareUsagePeriods({
      baselineUsage,
      afterUsage,
      teamId: "checkout",
      baselineTotals: {
        beforeTokens: 100_000,
        afterTokens: 80_000,
        savedTokens: 20_000,
      },
      assumptions: DEFAULT_ASSUMPTIONS,
    });
    expect(compare!.actualBilledChange).toBe(270);
    expect(compare!.baseline.period).toBe("2026-08");
    expect(compare!.after.period).toBe("2026-09");
  });
});
