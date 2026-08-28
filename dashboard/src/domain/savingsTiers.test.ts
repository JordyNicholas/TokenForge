import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import {
  SAVINGS_TIERS,
  TIER_UNAVAILABLE,
  buildSavingsTierValues,
  tierValueImportedBill,
  tierValueLiveHygiene,
  tierValueProjectedUsd,
  tierValueScanDelta,
} from "./savingsTiers";
import type { UsageMetrics } from "./usage";

const totals = {
  beforeTokens: 10_000,
  afterTokens: 3_000,
  savedTokens: 7_000,
};

const usage: UsageMetrics = {
  period: "2026-01",
  providerLabel: "Demo Copilot",
  source: "demo",
  teams: [
    {
      team: "payments-platform",
      creditsUsed: 1200,
      estimatedUsd: 480,
    },
  ],
  totals: { creditsUsed: 1200, estimatedUsd: 480 },
};

describe("savingsTiers", () => {
  it("defines four ordered tiers", () => {
    expect(SAVINGS_TIERS).toHaveLength(4);
    expect(SAVINGS_TIERS.map((tier) => tier.order)).toEqual([1, 2, 3, 4]);
  });

  it("live hygiene is extension-only on dashboard", () => {
    const value = tierValueLiveHygiene();
    expect(value.available).toBe(false);
    expect(value.value).toBe(TIER_UNAVAILABLE);
  });

  it("scan delta shows tokens when scan is loaded", () => {
    const value = tierValueScanDelta(totals, true);
    expect(value.available).toBe(true);
    expect(value.value).toContain("7");
  });

  it("scan delta is not available without a scan", () => {
    expect(tierValueScanDelta(null, false).value).toBe(TIER_UNAVAILABLE);
  });

  it("projected $ is not available without scan", () => {
    expect(tierValueProjectedUsd(null, false).value).toBe(TIER_UNAVAILABLE);
  });

  it("imported bill prefers period compare over single usage snapshot", () => {
    const fromUsage = tierValueImportedBill({ compare: null, usage, teamId: "payments-platform" });
    expect(fromUsage.available).toBe(true);
    expect(fromUsage.value).toBe("$480");

    const fromCompare = tierValueImportedBill({
      compare: {
        baseline: {
          creditsUsed: 100,
          estimatedUsd: 400,
          period: "2026-01",
          providerLabel: "Demo",
        },
        after: {
          creditsUsed: 80,
          estimatedUsd: 320,
          period: "2026-02",
          providerLabel: "Demo",
        },
        estimatedUsdReduction: 50,
        actualBilledChange: 80,
        varianceUsd: 30,
        gapPercent: 60,
        periodMismatch: false,
        providerMismatch: false,
        assumptionsUsed: DEFAULT_ASSUMPTIONS,
        assumptionsFrozen: false,
        liveAssumptionsDrift: false,
      },
      usage,
      teamId: null,
    });
    expect(fromCompare.available).toBe(true);
    expect(fromCompare.value).toBe("+$80");
  });

  it("imported bill shows not available when no usage loaded", () => {
    expect(
      tierValueImportedBill({ compare: null, usage: null, teamId: null }).value,
    ).toBe(TIER_UNAVAILABLE);
  });

  it("buildSavingsTierValues never uses zero as a stand-in for missing bill data", () => {
    const values = buildSavingsTierValues({
      hasScan: false,
      totals: null,
      assumptions: DEFAULT_ASSUMPTIONS,
      compare: null,
      usage: null,
      teamId: null,
    });
    expect(values["imported-bill"].value).toBe(TIER_UNAVAILABLE);
    expect(values["projected-usd"].value).toBe(TIER_UNAVAILABLE);
  });
});
