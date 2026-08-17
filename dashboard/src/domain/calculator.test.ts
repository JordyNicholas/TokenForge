import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import {
  blendedUsdPerMillion,
  projectSavings,
  scenarioSavedPercent,
  tokenSavedPercent,
} from "./calculator";

const DEMO_TOTALS = {
  beforeTokens: 2_955_959,
  afterTokens: 2_069_171,
  savedTokens: 886_788,
};

const noisyAppTotals = {
  beforeTokens: 455_959,
  afterTokens: 733,
  savedTokens: 455_226,
};

describe("tokenSavedPercent", () => {
  it("is 30.0 on the demo BU totals", () => {
    expect(tokenSavedPercent(DEMO_TOTALS)).toBe(30);
  });

  it("is 99.8 on the noisy-app fixture totals", () => {
    expect(tokenSavedPercent(noisyAppTotals)).toBe(99.8);
  });

  it("is 0 when beforeTokens is 0", () => {
    expect(
      tokenSavedPercent({ beforeTokens: 0, afterTokens: 0, savedTokens: 0 }),
    ).toBe(0);
  });
});

describe("scenarioSavedPercent", () => {
  it("matches token % when applicability is 100%", () => {
    expect(scenarioSavedPercent(DEMO_TOTALS, DEFAULT_ASSUMPTIONS)).toBe(30);
  });

  it("is ~30% on noisy-app when applicability is 30%", () => {
    expect(
      scenarioSavedPercent(noisyAppTotals, {
        ...DEFAULT_ASSUMPTIONS,
        realizedWasteShare: 0.3,
      }),
    ).toBe(30);
  });
});

describe("projectSavings", () => {
  it("scales $ with rate and team size", () => {
    const base = projectSavings(DEMO_TOTALS, DEFAULT_ASSUMPTIONS);
    const doubleRate = projectSavings(DEMO_TOTALS, {
      ...DEFAULT_ASSUMPTIONS,
      usdPerMillionTokens: DEFAULT_ASSUMPTIONS.usdPerMillionTokens * 2,
    });
    const doubleTeam = projectSavings(DEMO_TOTALS, {
      ...DEFAULT_ASSUMPTIONS,
      teamSize: DEFAULT_ASSUMPTIONS.teamSize * 2,
    });
    expect(doubleRate.monthlyUsdSaved).toBeCloseTo(base.monthlyUsdSaved * 2);
    expect(doubleTeam.monthlyUsdSaved).toBeCloseTo(base.monthlyUsdSaved * 2);
    expect(doubleRate.scenarioSavedPercent).toBe(base.scenarioSavedPercent);
  });

  it("raises blended rate when premium mix increases", () => {
    const low = blendedUsdPerMillion({
      ...DEFAULT_ASSUMPTIONS,
      premiumShare: 0,
    });
    const high = blendedUsdPerMillion({
      ...DEFAULT_ASSUMPTIONS,
      premiumShare: 1,
    });
    expect(low).toBe(DEFAULT_ASSUMPTIONS.usdPerMillionTokens);
    expect(high).toBe(
      DEFAULT_ASSUMPTIONS.usdPerMillionTokens *
        DEFAULT_ASSUMPTIONS.premiumMultiplier,
    );
  });
});
