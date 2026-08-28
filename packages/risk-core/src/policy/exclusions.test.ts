import { describe, expect, it } from "vitest";
import type { TokenRiskReport } from "../domain/types";
import {
  discoverMissedOpportunities,
  isPathCoveredByExclusion,
  missedOpportunityTokens,
  proposedExclusionPaths,
} from "./exclusions";

function report(
  findings: TokenRiskReport["findings"],
  activePaths?: string[],
): TokenRiskReport {
  return {
    source: "cli",
    timestamp: "2026-01-01T00:00:00.000Z",
    repo: "demo",
    team: "local",
    provider: "copilot",
    findings,
    totals: { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
    ...(activePaths ? { activePaths } : {}),
  };
}

describe("isPathCoveredByExclusion", () => {
  it("matches exact paths and directory globs", () => {
    expect(
      isPathCoveredByExclusion("package-lock.json", ["package-lock.json"]),
    ).toBe(true);
    expect(isPathCoveredByExclusion("dist/bundle.js", ["dist/**"])).toBe(true);
    expect(isPathCoveredByExclusion("src/index.ts", ["dist/**"])).toBe(false);
  });
});

describe("proposedExclusionPaths", () => {
  it("excludes active paths from the proposed pack", () => {
    const paths = proposedExclusionPaths(
      report(
        [
          {
            path: "package-lock.json",
            reason: "high_risk_filetype",
            bytes: 100,
            estTokens: 25,
            action: "excluded",
          },
          {
            path: "locales/en.json",
            reason: "oversized",
            bytes: 200,
            estTokens: 50,
            action: "kept",
          },
        ],
        ["locales/en.json"],
      ),
    );
    expect(paths).toEqual(["package-lock.json"]);
  });
});

describe("discoverMissedOpportunities", () => {
  it("flags policy gaps and session-kept rows", () => {
    const opportunities = discoverMissedOpportunities(
      report([
        {
          path: "package-lock.json",
          reason: "high_risk_filetype",
          bytes: 100,
          estTokens: 25,
          action: "excluded",
        },
        {
          path: "dist/bundle.js",
          reason: "high_risk_filetype",
          bytes: 100,
          estTokens: 30,
          action: "excluded",
        },
        {
          path: "locales/en.json",
          reason: "oversized",
          bytes: 200,
          estTokens: 50,
          action: "kept",
        },
      ]),
      ["dist/**"],
    );

    expect(opportunities).toEqual([
      {
        path: "locales/en.json",
        reason: "oversized",
        estTokens: 50,
        category: "session_kept",
      },
      {
        path: "package-lock.json",
        reason: "high_risk_filetype",
        estTokens: 25,
        category: "policy_gap",
      },
    ]);
    expect(missedOpportunityTokens(opportunities)).toBe(75);
  });
});
