import { describe, expect, it } from "vitest";
import type { ProveChangeMarker } from "@tokenforge/risk-core";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import {
  compareCohorts,
  fixOnTeamsFromMarkers,
} from "./cohortCompare";
import type { UsageMetrics } from "./usage";
import { buildVarianceBoard } from "./varianceBoard";

const baselineUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot",
  period: "2026-08",
  teams: [
    { team: "checkout", creditsUsed: 8200, estimatedUsd: 1230 },
    { team: "payments-platform", creditsUsed: 12400, estimatedUsd: 1860 },
    { team: "data-eng", creditsUsed: 4500, estimatedUsd: 675 },
  ],
  totals: { creditsUsed: 25100, estimatedUsd: 3765 },
};

const afterUsage: UsageMetrics = {
  source: "import",
  providerLabel: "Copilot",
  period: "2026-09",
  teams: [
    { team: "checkout", creditsUsed: 6400, estimatedUsd: 960 },
    { team: "payments-platform", creditsUsed: 9800, estimatedUsd: 1470 },
    { team: "data-eng", creditsUsed: 4400, estimatedUsd: 660 },
  ],
  totals: { creditsUsed: 20600, estimatedUsd: 3090 },
};

const reports = [
  {
    team: "checkout",
    repo: "checkout-svc",
    totals: { beforeTokens: 500_000, afterTokens: 400_000, savedTokens: 100_000 },
  },
  {
    team: "payments-platform",
    repo: "payments-svc",
    totals: { beforeTokens: 500_000, afterTokens: 300_000, savedTokens: 200_000 },
  },
  {
    team: "data-eng",
    repo: "pipelines",
    totals: { beforeTokens: 200_000, afterTokens: 180_000, savedTokens: 20_000 },
  },
] as const;

describe("fixOnTeamsFromMarkers", () => {
  it("collects unique team labels from markers", () => {
    const markers: ProveChangeMarker[] = [
      {
        timestamp: "2026-08-25T16:00:00.000Z",
        provider: "copilot",
        packId: "apply:copilot",
        action: "apply",
        team: "payments-platform",
      },
      {
        timestamp: "2026-08-25T17:00:00.000Z",
        provider: "copilot",
        packId: "apply:copilot",
        action: "apply",
        team: "checkout",
      },
      {
        timestamp: "2026-08-25T18:00:00.000Z",
        provider: "copilot",
        packId: "apply:copilot",
        action: "apply",
        team: "payments-platform",
      },
    ];
    expect(fixOnTeamsFromMarkers(markers)).toEqual([
      "checkout",
      "payments-platform",
    ]);
  });
});

describe("compareCohorts", () => {
  it("splits Fix-on vs control actual billed change", () => {
    const board = buildVarianceBoard({
      baselineUsage,
      afterUsage,
      reports: [...reports],
      liveAssumptions: DEFAULT_ASSUMPTIONS,
    });
    const compare = compareCohorts(board, ["payments-platform", "checkout"]);
    expect(compare.hasFixOn).toBe(true);
    expect(compare.fixOn.teams).toEqual(["checkout", "payments-platform"]);
    expect(compare.control.teams).toEqual(["data-eng"]);
    expect(compare.fixOn.actualBilledChangeUsd).toBe(270 + 390);
    expect(compare.control.actualBilledChangeUsd).toBe(15);
    expect(compare.honestyNote).toMatch(/not proof/i);
  });

  it("marks all teams unknown when no Fix-on list", () => {
    const board = buildVarianceBoard({
      baselineUsage,
      afterUsage,
      reports: [...reports],
      liveAssumptions: DEFAULT_ASSUMPTIONS,
    });
    const compare = compareCohorts(board, []);
    expect(compare.hasFixOn).toBe(false);
    expect(compare.unknown.teamCount).toBe(3);
    expect(compare.fixOn.teamCount).toBe(0);
    expect(compare.control.teamCount).toBe(0);
  });
});
