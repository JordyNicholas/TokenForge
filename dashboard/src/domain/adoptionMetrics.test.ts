import { describe, expect, it } from "vitest";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { ADOPTION_UNAVAILABLE, computeRepoCoverage } from "./adoptionMetrics";

const reports: TokenRiskReport[] = [
  {
    source: "cli",
    timestamp: "2026-08-01T00:00:00.000Z",
    repo: "a",
    team: "alpha",
    provider: "generic",
    findings: [],
    totals: { beforeTokens: 1, afterTokens: 1, savedTokens: 0 },
  },
  {
    source: "cli",
    timestamp: "2026-08-01T00:00:00.000Z",
    repo: "b",
    team: "beta",
    provider: "generic",
    findings: [],
    totals: { beforeTokens: 1, afterTokens: 1, savedTokens: 0 },
  },
  {
    source: "cli",
    timestamp: "2026-08-01T00:00:00.000Z",
    repo: "c",
    team: "gamma",
    provider: "generic",
    findings: [],
    totals: { beforeTokens: 1, afterTokens: 1, savedTokens: 0 },
  },
];

describe("computeRepoCoverage", () => {
  it("counts scanned teams on the loaded board", () => {
    const metrics = computeRepoCoverage(reports, []);
    expect(metrics.totalTeams).toBe(3);
    expect(metrics.teamsWithScan).toBe(3);
    expect(metrics.scanCoveragePercent).toBe(100);
    expect(metrics.applyCoveragePercent).toBeNull();
  });

  it("computes apply marker coverage when markers are loaded", () => {
    const metrics = computeRepoCoverage(reports, ["alpha", "gamma"]);
    expect(metrics.teamsWithApplyMarker).toBe(2);
    expect(metrics.applyCoveragePercent).toBe(67);
  });

  it("does not show zero apply coverage when markers are missing", () => {
    expect(computeRepoCoverage(reports, []).applyCoveragePercent).toBeNull();
    expect(ADOPTION_UNAVAILABLE).toBe("Not available");
  });
});
