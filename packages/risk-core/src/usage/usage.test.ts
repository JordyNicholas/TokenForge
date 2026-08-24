import { describe, expect, it } from "vitest";
import {
  isUsageMetrics,
  totalsFromUsageTeams,
  usageForTeam,
  type UsageMetrics,
} from "./usage";

const sample: UsageMetrics = {
  source: "demo",
  providerLabel: "demo",
  period: "2026-08",
  teams: [{ team: "checkout", creditsUsed: 10, estimatedUsd: 2 }],
  totals: { creditsUsed: 10, estimatedUsd: 2 },
};

describe("usage contract (risk-core)", () => {
  it("validates and slices usage metrics", () => {
    expect(isUsageMetrics(sample)).toBe(true);
    expect(usageForTeam(sample, null)?.creditsUsed).toBe(10);
    expect(usageForTeam(sample, "checkout")?.estimatedUsd).toBe(2);
    expect(usageForTeam(sample, "missing")).toBeNull();
  });

  it("accepts sync as a UsageMetrics source", () => {
    expect(isUsageMetrics({ ...sample, source: "sync" })).toBe(true);
  });

  it("rejects unknown sources", () => {
    expect(isUsageMetrics({ ...sample, source: "api" })).toBe(false);
  });

  it("sums team rows into totals", () => {
    expect(
      totalsFromUsageTeams([
        { team: "a", creditsUsed: 1, estimatedUsd: 2 },
        { team: "b", creditsUsed: 3, estimatedUsd: 4 },
      ]),
    ).toEqual({ creditsUsed: 4, estimatedUsd: 6 });
  });
});
