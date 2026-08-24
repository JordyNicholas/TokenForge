import { describe, expect, it } from "vitest";
import { normalizeUsagePeriodPair } from "./usagePeriodOrder";

describe("normalizeUsagePeriodPair", () => {
  it("keeps chronological baseline → after", () => {
    expect(normalizeUsagePeriodPair("2026-08", "2026-09")).toEqual({
      baselinePeriod: "2026-08",
      afterPeriod: "2026-09",
      inverted: false,
    });
  });

  it("swaps when baseline is later than after", () => {
    expect(normalizeUsagePeriodPair("2026-09", "2026-08")).toEqual({
      baselinePeriod: "2026-08",
      afterPeriod: "2026-09",
      inverted: true,
    });
  });

  it("passes through when either period is missing", () => {
    expect(normalizeUsagePeriodPair("2026-08", null)).toEqual({
      baselinePeriod: "2026-08",
      afterPeriod: null,
      inverted: false,
    });
  });
});
