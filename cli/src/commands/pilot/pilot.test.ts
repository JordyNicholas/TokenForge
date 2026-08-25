import { afterEach, describe, expect, it } from "vitest";
import { isProveChangeMarker } from "@tokenforge/risk-core";
import { cleanupFixture, fixtureRoot } from "../../test/helpers";
import { runPilotPack } from "./pilot";

describe("pilot pack", () => {
  afterEach(cleanupFixture);

  it("scans and applies a local pack with a Prove change marker", async () => {
    const result = await runPilotPack({
      root: fixtureRoot,
      provider: "copilot",
      team: "payments-platform",
      repo: "fixtures/noisy-app",
    });
    expect(result.report.totals.savedTokens).toBeGreaterThan(0);
    expect(result.apply).not.toBeNull();
    expect(isProveChangeMarker(result.changeMarker)).toBe(true);
    expect(result.steps.some((step) => step.startsWith("scan"))).toBe(true);
    expect(result.steps.some((step) => step.includes("apply"))).toBe(true);
  });

  it("supports dry-run apply without writing policy files", async () => {
    const result = await runPilotPack({
      root: fixtureRoot,
      provider: "copilot",
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.changeMarker).toBeUndefined();
    expect(result.apply?.dryRun).toBe(true);
  });

  it("can skip apply after scan", async () => {
    const result = await runPilotPack({
      root: fixtureRoot,
      skipApply: true,
    });
    expect(result.apply).toBeNull();
    expect(result.steps).toContain("apply skipped");
  });
});
