import { describe, expect, it } from "vitest";
import { parseDiscoverLatestJson } from "./parseDiscoverLatest";

describe("parseDiscoverLatestJson", () => {
  it("counts CLI policy_gap and session_kept rows", () => {
    const summary = parseDiscoverLatestJson(
      JSON.stringify({
        timestamp: "2026-01-01T00:00:00.000Z",
        missedTokens: 1200,
        opportunities: [
          { path: "lock.json", reason: "lockfile", estTokens: 800, category: "policy_gap" },
          { path: "src/app.ts", reason: "large", estTokens: 400, category: "session_kept" },
        ],
      }),
    );
    expect(summary.policyGapCount).toBe(1);
    expect(summary.sessionKeptCount).toBe(1);
    expect(summary.missedTokens).toBe(1200);
  });

  it("accepts extension kind tags", () => {
    const summary = parseDiscoverLatestJson(
      JSON.stringify({
        missedTokens: 50,
        opportunities: [{ path: "node_modules", kind: "policy_gap", estTokens: 50 }],
      }),
    );
    expect(summary.policyGapCount).toBe(1);
  });
});
