import { describe, expect, it } from "vitest";
import { boardHasSavings } from "./boardSavings";

describe("boardHasSavings", () => {
  it("is false for all-zero LLM-style totals", () => {
    expect(
      boardHasSavings({ beforeTokens: 0, afterTokens: 0, savedTokens: 0 }),
    ).toBe(false);
  });

  it("is true when before or saved is positive", () => {
    expect(
      boardHasSavings({ beforeTokens: 100, afterTokens: 40, savedTokens: 60 }),
    ).toBe(true);
    expect(
      boardHasSavings({ beforeTokens: 0, afterTokens: 0, savedTokens: 1 }),
    ).toBe(true);
  });
});
