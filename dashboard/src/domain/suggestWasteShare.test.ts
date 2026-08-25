import { describe, expect, it } from "vitest";
import { suggestRealizedWasteShare } from "./suggestWasteShare";

describe("suggestRealizedWasteShare", () => {
  it("scales share linearly toward the observed billed reduction", () => {
    const suggestion = suggestRealizedWasteShare({
      currentShare: 1,
      estimatedUsdReduction: 1000,
      actualBilledChange: 300,
    });
    expect(suggestion).toMatchObject({
      suggestedShare: 0.3,
      currentShare: 1,
      deltaShare: -0.7,
    });
    expect(suggestion?.rationale).toMatch(/Re-freeze/i);
  });

  it("returns null when estimate or actual is not positive", () => {
    expect(
      suggestRealizedWasteShare({
        currentShare: 0.3,
        estimatedUsdReduction: 0,
        actualBilledChange: 100,
      }),
    ).toBeNull();
    expect(
      suggestRealizedWasteShare({
        currentShare: 0.3,
        estimatedUsdReduction: 100,
        actualBilledChange: -10,
      }),
    ).toBeNull();
  });

  it("clamps suggestions to [0, 1]", () => {
    const suggestion = suggestRealizedWasteShare({
      currentShare: 0.5,
      estimatedUsdReduction: 100,
      actualBilledChange: 400,
    });
    expect(suggestion?.suggestedShare).toBe(1);
  });
});
