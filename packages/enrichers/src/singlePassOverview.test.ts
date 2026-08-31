import { describe, expect, it } from "vitest";
import {
  analysisOverviewFromPayload,
  resolveSinglePassAnalysisOverview,
} from "./singlePassOverview";

describe("analysisOverviewFromPayload", () => {
  it("parses a valid analysisOverview object", () => {
    expect(
      analysisOverviewFromPayload({
        findings: [],
        analysisOverview: {
          summary: "Mostly low-signal config noise.",
          themes: ["config bloat"],
          caveats: ["Single batch only"],
        },
      }),
    ).toEqual({
      summary: "Mostly low-signal config noise.",
      themes: ["config bloat"],
      caveats: ["Single batch only"],
    });
  });

  it("returns undefined when overview is missing or invalid", () => {
    expect(analysisOverviewFromPayload({ findings: [] })).toBeUndefined();
    expect(analysisOverviewFromPayload(null)).toBeUndefined();
    expect(
      analysisOverviewFromPayload({
        findings: [],
        analysisOverview: { themes: ["only themes"] },
      }),
    ).toBeUndefined();
  });
});

describe("resolveSinglePassAnalysisOverview", () => {
  it("prefers the latest batch payload with a usable overview", () => {
    const overview = resolveSinglePassAnalysisOverview({
      payloads: [
        { findings: [], analysisOverview: { summary: "First batch summary." } },
        {
          findings: [],
          analysisOverview: {
            summary: "Second batch summary with more context.",
            themes: ["redundant docs"],
          },
        },
      ],
      findingCount: 2,
      candidateCount: 5,
    });

    expect(overview.summary).toBe("Second batch summary with more context.");
    expect(overview.themes).toEqual(["redundant docs"]);
  });

  it("falls back deterministically when no batch returned an overview", () => {
    const overview = resolveSinglePassAnalysisOverview({
      payloads: [{ findings: [] }, { findings: [{ path: "a.md" }] }],
      findingCount: 1,
      candidateCount: 3,
    });

    expect(overview.summary).toMatch(/reviewed 3 candidate path/);
    expect(overview.summary).toMatch(/1 finding/);
    expect(overview.themes).toEqual(["hybrid enrich"]);
    expect(overview.caveats?.[0]).toMatch(/context map was unavailable/);
  });
});
