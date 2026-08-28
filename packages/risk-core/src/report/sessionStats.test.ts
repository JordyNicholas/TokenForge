import { describe, expect, it } from "vitest";
import { isSessionStatsReport } from "./sessionStats";

describe("isSessionStatsReport", () => {
  it("accepts a valid session stats report", () => {
    expect(
      isSessionStatsReport({
        source: "extension",
        timestamp: "2026-08-27T19:00:00.000Z",
        repo: "TokenForge",
        team: "default",
        sessionAvoidedTokens: 1200,
        sessionHistory: [
          {
            path: "package-lock.json",
            estTokens: 1200,
            reason: "high_risk_filetype",
            filteredAt: "2026-08-27T18:59:00.000Z",
          },
        ],
      }),
    ).toBe(true);
  });

  it("accepts optional adoption fields (#174)", () => {
    expect(
      isSessionStatsReport({
        source: "extension",
        timestamp: "2026-08-27T19:00:00.000Z",
        repo: "TokenForge",
        team: "default",
        sessionAvoidedTokens: 0,
        sessionHistory: [],
        atRiskTabsFilteredPercent: 40,
        filterEventCount: 2,
      }),
    ).toBe(true);
  });

  it("rejects invalid payloads", () => {
    expect(isSessionStatsReport({ source: "cli" })).toBe(false);
    expect(isSessionStatsReport(null)).toBe(false);
  });
});
