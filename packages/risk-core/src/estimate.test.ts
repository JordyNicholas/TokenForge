import { describe, expect, it } from "vitest";
import { estimateTokens } from "./estimate";

describe("estimateTokens", () => {
  it("uses ceil(bytes / 4)", () => {
    expect(estimateTokens(0)).toBe(0);
    expect(estimateTokens(1)).toBe(1);
    expect(estimateTokens(4)).toBe(1);
    expect(estimateTokens(5)).toBe(2);
    expect(estimateTokens(2_400_000)).toBe(600_000);
  });

  it("treats non-finite and negative sizes as zero", () => {
    expect(estimateTokens(-12)).toBe(0);
    expect(estimateTokens(Number.NaN)).toBe(0);
    expect(estimateTokens(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
