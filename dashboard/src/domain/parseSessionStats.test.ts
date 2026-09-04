import { describe, expect, it } from "vitest";
import { parseSessionStatsJson } from "./parseSessionStats";

const valid = {
  source: "extension",
  timestamp: "2026-09-04T12:00:00.000Z",
  repo: "demo",
  team: "payments-platform",
  sessionAvoidedTokens: 1200,
  sessionHistory: [
    {
      path: "package-lock.json",
      estTokens: 400,
      reason: "high_risk_filetype",
      filteredAt: "2026-09-04T11:00:00.000Z",
    },
  ],
  atRiskTabsFilteredPercent: 50,
  filterEventCount: 1,
};

describe("parseSessionStatsJson", () => {
  it("accepts a valid session-stats report", () => {
    const report = parseSessionStatsJson(JSON.stringify(valid));
    expect(report.sessionAvoidedTokens).toBe(1200);
    expect(report.atRiskTabsFilteredPercent).toBe(50);
  });

  it("rejects invalid JSON shape", () => {
    expect(() => parseSessionStatsJson("{}")).toThrow(/session-stats/);
  });
});
