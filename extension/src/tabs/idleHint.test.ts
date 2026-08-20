import { INACTIVE_MS } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import type { TrackedTab } from "./types";
import { formatDurationMs, idleHintForTab } from "./idleHint";

function tab(overrides: Partial<TrackedTab> & Pick<TrackedTab, "assessment">): TrackedTab {
  return {
    uri: "file:///src/a.ts",
    path: "src/a.ts",
    bytes: 100,
    lastFocusAt: 0,
    lastEditAt: 0,
    lastActivityAt: 0,
    ...overrides,
  };
}

describe("formatDurationMs", () => {
  it("formats compact durations", () => {
    expect(formatDurationMs(0)).toBe("<1m");
    expect(formatDurationMs(59_000)).toBe("<1m");
    expect(formatDurationMs(60_000)).toBe("1m");
    expect(formatDurationMs(4 * 60_000)).toBe("4m");
    expect(formatDurationMs(65 * 60_000)).toBe("1h 5m");
  });
});

describe("idleHintForTab", () => {
  const now = 1_000_000;

  it("shows idle-for when inactive_tab is already flagged", () => {
    const hint = idleHintForTab(
      tab({
        lastActivityAt: now - INACTIVE_MS - 120_000,
        assessment: {
          path: "src/a.ts",
          bytes: 100,
          estTokens: 25,
          fileClass: "source",
          score: 40,
          atRisk: true,
          reasons: ["inactive_tab"],
        },
      }),
      now,
    );
    expect(hint).toEqual({ kind: "idle_for", label: "idle 17m" });
  });

  it("shows countdown for source tabs approaching 15m idle", () => {
    const hint = idleHintForTab(
      tab({
        lastActivityAt: now - 11 * 60_000,
        assessment: {
          path: "src/a.ts",
          bytes: 100,
          estTokens: 25,
          fileClass: "source",
          score: 10,
          atRisk: false,
          reasons: [],
        },
      }),
      now,
    );
    expect(hint?.kind).toBe("at_risk_in");
    expect(hint?.label).toBe("at risk in 4m");
  });

  it("skips countdown for fresh tabs", () => {
    const hint = idleHintForTab(
      tab({
        lastActivityAt: now - 30_000,
        assessment: {
          path: "src/a.ts",
          bytes: 100,
          estTokens: 25,
          fileClass: "source",
          score: 5,
          atRisk: false,
          reasons: [],
        },
      }),
      now,
    );
    expect(hint).toBeUndefined();
  });
});
