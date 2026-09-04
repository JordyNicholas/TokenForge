import { describe, expect, it } from "vitest";
import type { ProveChangeMarker } from "@tokenforge/risk-core";
import { bindPeriodsAroundMarkers } from "./periodBindFromMarkers";
import type { UsageMetrics } from "./usage";

function usage(period: string): UsageMetrics {
  return {
    period,
    providerLabel: "demo",
    teams: [{ team: "checkout", credits: 100, costUsd: 10 }],
  };
}

const marker = (timestamp: string): ProveChangeMarker => ({
  timestamp,
  provider: "copilot",
  packId: "apply-copilot",
  action: "apply",
  team: "checkout",
});

describe("bindPeriodsAroundMarkers", () => {
  it("brackets marker month with before/after snapshots", () => {
    const snapshots = {
      "2026-07": usage("2026-07"),
      "2026-08": usage("2026-08"),
      "2026-09": usage("2026-09"),
    };
    const result = bindPeriodsAroundMarkers(snapshots, [
      marker("2026-08-15T12:00:00.000Z"),
    ]);
    expect(result.baselinePeriod).toBe("2026-07");
    expect(result.afterPeriod).toBe("2026-08");
    expect(result.unbound).toBe(false);
  });

  it("flags unbound when only one snapshot exists with markers", () => {
    const result = bindPeriodsAroundMarkers(
      { "2026-08": usage("2026-08") },
      [marker("2026-08-15T12:00:00.000Z")],
    );
    expect(result.baselinePeriod).toBe("2026-08");
    expect(result.afterPeriod).toBeNull();
    expect(result.unbound).toBe(true);
  });
});
