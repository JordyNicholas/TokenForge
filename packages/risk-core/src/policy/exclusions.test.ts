import { describe, expect, it } from "vitest";
import type { TokenRiskReport } from "../domain/types";
import {
  discoverMissedOpportunities,
  isPathCoveredByExclusion,
  missedOpportunityTokens,
  proposedExclusionPaths,
  proposedIgnorePaths,
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

describe("proposedIgnorePaths", () => {
  it("includes exclusion paths and extra add_ignore suggestions", () => {
    const paths = proposedIgnorePaths(
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
            path: "config/low-signal.json",
            reason: "low_signal_config",
            bytes: 80,
            estTokens: 20,
            action: "kept",
            source: "llm",
            suggestion: {
              kind: "add_ignore",
              summary: "Low-signal config; ignore in agent context.",
            },
          },
        ],
        ["locales/en.json"],
      ),
    );
    expect(paths).toContain("package-lock.json");
    expect(paths).toContain("config/low-signal.json");
    expect(paths).not.toContain("locales/en.json");
  });

  it("drops advisory and unsafe LLM add_ignore paths", () => {
    const paths = proposedIgnorePaths(
      report([
        {
          path: "src/utils/checkEmailFormat.js",
          reason: "duplicate_logic",
          bytes: 100,
          estTokens: 25,
          action: "kept",
          source: "llm",
          suggestion: {
            kind: "add_ignore",
            summary: "Should never land in ignore candidates.",
          },
        },
        {
          path: "src/index.ts",
          reason: "semantic_bloat",
          bytes: 100,
          estTokens: 25,
          action: "kept",
          source: "llm",
          suggestion: {
            kind: "add_ignore",
            summary: "Unsafe source exclude.",
          },
        },
      ]),
    );
    expect(paths).toEqual([]);
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
