import { isTokenRiskReport } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { tokenSavedPercent } from "./calculator";
import { DEMO_SEED, DEMO_TOTALS, aggregateTotals } from "./seed";
import { heatColor, tokensByFileClass, topOffenders } from "./views";

describe("DEMO_SEED", () => {
  it("is a valid Token Risk report per team", () => {
    expect(DEMO_SEED.reports.every(isTokenRiskReport)).toBe(true);
  });

  it("rolls up to 30.0% token savings", () => {
    expect(aggregateTotals(DEMO_SEED.reports)).toEqual(DEMO_TOTALS);
    expect(tokenSavedPercent(DEMO_TOTALS)).toBe(30);
  });

  it("keeps noisy-app totals on payments-platform", () => {
    const payments = DEMO_SEED.reports.find(
      (report) => report.team === "payments-platform",
    );
    expect(payments?.totals).toEqual({
      beforeTokens: 455959,
      afterTokens: 733,
      savedTokens: 455226,
    });
    expect(tokenSavedPercent(payments?.totals ?? DEMO_TOTALS)).toBe(99.8);
  });
});

describe("topOffenders", () => {
  it("lists the noisy-app lockfile first", () => {
    const [first] = topOffenders(DEMO_SEED.reports, 3);
    expect(first?.path).toBe("package-lock.json");
    expect(first?.team).toBe("payments-platform");
    expect(first?.fileClass).toBe("lockfile");
  });
});

describe("tokensByFileClass", () => {
  it("orders classes by wasted tokens", () => {
    const buckets = tokensByFileClass(DEMO_SEED.reports);
    expect(buckets[0]?.fileClass).toBe("lockfile");
    expect(buckets.map((bucket) => bucket.fileClass)).toEqual(
      expect.arrayContaining(["lockfile", "generated", "config"]),
    );
  });
});

describe("heatColor", () => {
  it("returns distinct hsl colors", () => {
    expect(heatColor(10)).toMatch(/^hsl\(/);
    expect(heatColor(10)).not.toBe(heatColor(90));
  });
});
