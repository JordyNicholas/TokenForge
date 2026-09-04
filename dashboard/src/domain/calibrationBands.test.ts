import { describe, expect, it } from "vitest";
import { estimateVsBilledBand } from "./calibrationBands";

describe("estimateVsBilledBand", () => {
  it("returns insufficient when trust is none", () => {
    const result = estimateVsBilledBand({
      estimatedReductionUsd: 500,
      actualBilledChangeUsd: 400,
      hasControlCohort: false,
      trustLevel: "none",
    });
    expect(result.band).toBe("insufficient");
  });

  it("returns weak when there is no control cohort", () => {
    const result = estimateVsBilledBand({
      estimatedReductionUsd: 500,
      actualBilledChangeUsd: 400,
      hasControlCohort: false,
      trustLevel: "weak",
    });
    expect(result.band).toBe("weak");
    expect(result.rationale).toMatch(/no control cohort/i);
  });

  it("returns strong only with control, strong trust, and aligned movement", () => {
    const result = estimateVsBilledBand({
      estimatedReductionUsd: 400,
      actualBilledChangeUsd: 350,
      hasControlCohort: true,
      trustLevel: "strong",
    });
    expect(result.band).toBe("strong");
    expect(result.label).toMatch(/Strong calibration/i);
  });

  it("returns suggestive when aligned but magnitude is thin", () => {
    const result = estimateVsBilledBand({
      estimatedReductionUsd: 1000,
      actualBilledChangeUsd: 50,
      hasControlCohort: true,
      trustLevel: "strong",
    });
    expect(result.band).toBe("suggestive");
  });

  it("returns weak when movement misaligns", () => {
    const result = estimateVsBilledBand({
      estimatedReductionUsd: 500,
      actualBilledChangeUsd: -100,
      hasControlCohort: true,
      trustLevel: "strong",
    });
    expect(result.band).toBe("weak");
    expect(result.rationale).toMatch(/same direction|misaligned/i);
  });
});
