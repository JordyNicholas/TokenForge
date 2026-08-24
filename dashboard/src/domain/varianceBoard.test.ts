import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import type { UsageMetrics } from "./usage";
import {
  buildVarianceBoard,
  defaultAfterPeriod,
  listUsagePeriods,
  upsertUsageSnapshot,
} from "./varianceBoard";
import { varianceGapPercent } from "./varianceGap";

const baselineUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot",
  period: "2026-08",
  teams: [
    { team: "checkout", creditsUsed: 8200, estimatedUsd: 1230 },
    { team: "payments-platform", creditsUsed: 12400, estimatedUsd: 1860 },
  ],
  totals: { creditsUsed: 20600, estimatedUsd: 3090 },
};

const afterUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot",
  period: "2026-09",
  teams: [
    { team: "checkout", creditsUsed: 6400, estimatedUsd: 960 },
    { team: "payments-platform", creditsUsed: 9800, estimatedUsd: 1470 },
  ],
  totals: { creditsUsed: 16200, estimatedUsd: 2430 },
};

const reports = [
  {
    team: "checkout",
    repo: "checkout-svc",
    totals: { beforeTokens: 500_000, afterTokens: 400_000, savedTokens: 100_000 },
  },
  {
    team: "payments-platform",
    repo: "payments-svc",
    totals: { beforeTokens: 500_000, afterTokens: 300_000, savedTokens: 200_000 },
  },
] as const;

describe("varianceGapPercent", () => {
  it("returns null when estimate is zero", () => {
    expect(varianceGapPercent(10, 0)).toBeNull();
  });
});

describe("usage snapshot helpers", () => {
  it("lists and picks default after period", () => {
    const snapshots = upsertUsageSnapshot(
      upsertUsageSnapshot({}, baselineUsage),
      afterUsage,
    );
    expect(listUsagePeriods(snapshots)).toEqual(["2026-09", "2026-08"]);
    expect(defaultAfterPeriod(snapshots, "2026-08")).toBe("2026-09");
  });
});

describe("buildVarianceBoard", () => {
  it("builds team rows and BU roll-up with gap %", () => {
    const board = buildVarianceBoard({
      baselineUsage,
      afterUsage,
      reports: [...reports],
      liveAssumptions: DEFAULT_ASSUMPTIONS,
    });
    expect(board.baselinePeriod).toBe("2026-08");
    expect(board.afterPeriod).toBe("2026-09");
    expect(board.rows).toHaveLength(2);
    expect(board.bu.actualBilledChangeUsd).toBe(660);
    expect(board.bu.estimatedReductionUsd).toBeGreaterThan(0);
    expect(board.bu.gapPercent).not.toBeNull();
    const checkout = board.rows.find((row) => row.team === "checkout");
    expect(checkout?.actualBilledChangeUsd).toBe(270);
    expect(checkout?.incomplete).toBe(false);
  });

  it("marks rows incomplete when usage team is missing", () => {
    const board = buildVarianceBoard({
      baselineUsage,
      afterUsage: {
        ...afterUsage,
        teams: afterUsage.teams.filter((row) => row.team !== "checkout"),
      },
      reports: [...reports],
      liveAssumptions: DEFAULT_ASSUMPTIONS,
    });
    const checkout = board.rows.find((row) => row.team === "checkout");
    expect(checkout?.incomplete).toBe(true);
  });
});
