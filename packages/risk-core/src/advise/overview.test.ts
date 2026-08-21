import { describe, expect, it } from "vitest";
import { MAX_ANALYSIS_OVERVIEW_SUMMARY_CHARS } from "../domain/constants";
import { parseLlmAnalysisOverview } from "./overview";

describe("parseLlmAnalysisOverview", () => {
  it("accepts a bounded capsule", () => {
    expect(
      parseLlmAnalysisOverview({
        summary: "  Lockfiles dominate waste; AGENTS.md overlaps rules.  ",
        themes: ["lockfiles", "redundant instructions", "lockfiles"],
        caveats: ["Pass A fell back to flat batching"],
      }),
    ).toEqual({
      summary: "Lockfiles dominate waste; AGENTS.md overlaps rules.",
      themes: ["lockfiles", "redundant instructions"],
      caveats: ["Pass A fell back to flat batching"],
    });
  });

  it("rejects missing summary and clips long text", () => {
    expect(parseLlmAnalysisOverview({ themes: ["x"] })).toBeUndefined();
    const long = "a".repeat(MAX_ANALYSIS_OVERVIEW_SUMMARY_CHARS + 40);
    const parsed = parseLlmAnalysisOverview({ summary: long });
    expect(parsed?.summary.length).toBe(MAX_ANALYSIS_OVERVIEW_SUMMARY_CHARS);
    expect(parsed?.summary.endsWith("…")).toBe(true);
  });
});
