import { describe, expect, it } from "vitest";
import { sessionAdoptionFromCounts } from "./sessionAdoption";

describe("sessionAdoptionFromCounts", () => {
  it("computes filtered share of at-risk tabs", () => {
    expect(sessionAdoptionFromCounts({ filteredCount: 2, keptCount: 1, pendingCount: 1 })).toEqual({
      atRiskTabCount: 4,
      filteredTabCount: 2,
      filteredPercent: 50,
    });
  });

  it("returns null percent when no at-risk tabs", () => {
    expect(sessionAdoptionFromCounts({ filteredCount: 0, keptCount: 0, pendingCount: 0 })).toEqual({
      atRiskTabCount: 0,
      filteredTabCount: 0,
      filteredPercent: null,
    });
  });

  it("allows zero filtered when tabs are still pending", () => {
    expect(sessionAdoptionFromCounts({ filteredCount: 0, keptCount: 0, pendingCount: 3 }).filteredPercent).toBe(0);
  });
});
