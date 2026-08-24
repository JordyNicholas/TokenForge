import { describe, expect, it } from "vitest";
import { UsageError } from "../app/errors";
import { daysInUsagePeriod, parseUsagePeriod, usagePeriodEpochBounds } from "./period";

describe("parseUsagePeriod", () => {
  it("parses YYYY-MM and counts days", () => {
    expect(parseUsagePeriod("2026-08")).toEqual({
      label: "2026-08",
      year: 2026,
      month: 8,
      daysInMonth: 31,
    });
    expect(daysInUsagePeriod(parseUsagePeriod("2026-02"))).toHaveLength(28);
  });

  it("rejects invalid periods", () => {
    expect(() => parseUsagePeriod("2026-13")).toThrow(UsageError);
    expect(() => parseUsagePeriod("Aug-2026")).toThrow(/YYYY-MM/i);
  });

  it("derives epoch bounds for billing months", () => {
    const period = parseUsagePeriod("2026-08");
    expect(usagePeriodEpochBounds(period)).toEqual({
      startMs: Date.UTC(2026, 7, 1, 0, 0, 0, 0),
      endMs: Date.UTC(2026, 7, 31, 23, 59, 59, 999),
    });
  });
});
