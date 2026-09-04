import { describe, expect, it } from "vitest";
import type { UsageMetrics } from "./usage";
import {
  parseUsageTeamMapJson,
  remapUsageTeams,
  UsageTeamMapLoadError,
} from "./usageTeamMap";

const sampleUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot",
  period: "2026-08",
  teams: [
    { team: "Payments Platform", creditsUsed: 1000, estimatedUsd: 150 },
    { team: "Checkout", creditsUsed: 800, estimatedUsd: 120 },
    { team: "platform-services", creditsUsed: 600, estimatedUsd: 90 },
  ],
  totals: { creditsUsed: 2400, estimatedUsd: 360 },
};

describe("parseUsageTeamMapJson", () => {
  it("accepts schemaVersion 1 map documents", () => {
    expect(
      parseUsageTeamMapJson(
        JSON.stringify({
          schemaVersion: 1,
          map: {
            "Payments Platform": "payments-platform",
            Checkout: "checkout",
          },
        }),
      ),
    ).toEqual({
      "Payments Platform": "payments-platform",
      Checkout: "checkout",
    });
  });

  it("rejects invalid shape", () => {
    expect(() => parseUsageTeamMapJson("{}")).toThrow(UsageTeamMapLoadError);
    expect(() => parseUsageTeamMapJson('{"schemaVersion":2,"map":{}}')).toThrow(
      UsageTeamMapLoadError,
    );
  });
});

describe("remapUsageTeams", () => {
  it("renames team fields and rebuilds totals", () => {
    const remapped = remapUsageTeams(sampleUsage, {
      "Payments Platform": "payments-platform",
      Checkout: "checkout",
    });
    expect(remapped.teams.map((row) => row.team)).toEqual([
      "payments-platform",
      "checkout",
      "platform-services",
    ]);
    expect(remapped.totals).toEqual({ creditsUsed: 2400, estimatedUsd: 360 });
  });

  it("merges rows that map to the same TF team id", () => {
    const remapped = remapUsageTeams(sampleUsage, {
      "Payments Platform": "payments-platform",
      Checkout: "payments-platform",
    });
    expect(remapped.teams).toEqual([
      { team: "payments-platform", creditsUsed: 1800, estimatedUsd: 270 },
      { team: "platform-services", creditsUsed: 600, estimatedUsd: 90 },
    ]);
    expect(remapped.totals).toEqual({ creditsUsed: 2400, estimatedUsd: 360 });
  });

  it("returns usage unchanged when map is empty", () => {
    expect(remapUsageTeams(sampleUsage, {})).toBe(sampleUsage);
  });
});
