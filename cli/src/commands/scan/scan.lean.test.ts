import { isTokenRiskReport } from "@tokenforge/risk-core";
import { afterEach, describe, expect, it } from "vitest";
import { captureIo, cleanupFixtureAt, leanAppRoot } from "../../test/helpers";
import { runCli } from "../../app/cli";
import { scanRepo } from "./scan";

describe("scanRepo (lean-app, negative control)", () => {
  it("finds nothing to flag on a healthy repo", async () => {
    const { report, assessments } = await scanRepo({
      root: leanAppRoot,
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.totals.beforeTokens).toBeGreaterThan(0);
    expect(report.totals.afterTokens).toBe(report.totals.beforeTokens);
    expect(report.totals.savedTokens).toBe(0);
    expect(assessments.every((assessment) => !assessment.atRisk)).toBe(true);
  });

  afterEach(() => cleanupFixtureAt(leanAppRoot));

  it("exits 3 (no savings) via the CLI", async () => {
    const captured = captureIo();
    const code = await runCli(["scan", leanAppRoot, "--json"], captured.io);

    expect(code).toBe(3);
    expect(JSON.parse(captured.stdout)).toMatchObject({ savedTokens: 0, savedPercent: 0 });
  });
});
