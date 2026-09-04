import { describe, expect, it } from "vitest";
import { isProvePack, parseProvePackJson } from "./provePack";

const sampleReport = (team: string, repo: string) => ({
  source: "cli",
  timestamp: "2026-01-01T00:00:00.000Z",
  team,
  repo,
  provider: "generic",
  findings: [],
  totals: { beforeTokens: 110, afterTokens: 10, savedTokens: 100 },
});

describe("parseProvePackJson", () => {
  it("accepts a schemaVersion 1 org prove-pack", () => {
    const pack = {
      schemaVersion: 1,
      businessUnit: "Retail Banking",
      createdAt: "2026-09-04T12:00:00.000Z",
      seed: {
        businessUnit: "Retail Banking",
        reports: [sampleReport("payments", "pay-api")],
      },
      markers: [
        {
          timestamp: "2026-02-01T00:00:00.000Z",
          provider: "copilot",
          packId: "apply:copilot",
          action: "apply",
          team: "payments",
          repo: "pay-api",
        },
      ],
      sessions: [
        {
          team: "payments",
          repo: "pay-api",
          label: "inbox/payments/pay-api/.tokenforge/session-stats.json",
          stats: {
            source: "extension",
            timestamp: "2026-09-04T12:00:00.000Z",
            repo: "pay-api",
            team: "payments",
            sessionAvoidedTokens: 500,
            sessionHistory: [],
          },
        },
      ],
      discovers: [
        {
          team: "payments",
          repo: "pay-api",
          label: "inbox/payments/pay-api/.tokenforge/discover-latest.json",
          summary: {
            missedTokens: 80,
            policyGapCount: 2,
            sessionKeptCount: 1,
            opportunitiesCount: 3,
          },
        },
      ],
      coverage: {
        expectedTeams: ["payments", "checkout"],
        presentScanTeams: ["payments"],
        missingScans: ["checkout"],
        presentSessionTeams: ["payments"],
        missingSessions: ["checkout"],
      },
    };

    expect(isProvePack(pack)).toBe(true);
    const parsed = parseProvePackJson(JSON.stringify(pack));
    expect(parsed.seed.reports).toHaveLength(1);
    expect(parsed.markers).toHaveLength(1);
    expect(parsed.sessions[0]?.team).toBe("payments");
    expect(parsed.discovers[0]?.summary.policyGapCount).toBe(2);
    expect(parsed.coverage?.missingScans).toEqual(["checkout"]);
  });

  it("rejects invalid prove-pack shape", () => {
    expect(() => parseProvePackJson("{}")).toThrow(/prove-pack/i);
  });
});
