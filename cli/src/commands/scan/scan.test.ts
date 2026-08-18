import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isTokenRiskReport } from "@tokenforge/risk-core";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../../app/cli";
import { captureIo, cleanupFixture, fixtureRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

describe("scanRepo (noisy-app)", () => {
  it("scores the fixture with a non-zero beforeTokens baseline", async () => {
    const { report, assessments } = await scanRepo({
      root: fixtureRoot,
      team: "payments-platform",
      repo: "fixtures/noisy-app",
      now: new Date("2026-08-17T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.source).toBe("cli");
    expect(report.provider).toBe("generic");
    expect(report.totals.beforeTokens).toBeGreaterThan(400_000);
    expect(report.totals.afterTokens).toBeLessThan(report.totals.beforeTokens);
    expect(report.totals.savedTokens).toBe(
      report.totals.beforeTokens - report.totals.afterTokens,
    );
    expect(assessments.length).toBeGreaterThan(report.findings.length);

    const lockfile = report.findings.find((finding) => finding.path === "package-lock.json");
    expect(lockfile).toMatchObject({
      reason: "high_risk_filetype",
      action: "excluded",
    });
    expect(report.findings.some((finding) => finding.path.startsWith("src/"))).toBe(
      false,
    );
    expect(report.layers?.heuristic.findings).toEqual(report.findings);
    expect(report.layers?.combined.totals).toEqual(report.totals);
    expect(report.layers?.llm.findings).toEqual([]);
  });

  it("records hybrid scan metadata with the noop enricher", async () => {
    const { report } = await scanRepo({
      root: fixtureRoot,
      mode: "hybrid",
      now: new Date("2026-08-18T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.scan).toMatchObject({
      mode: "hybrid",
      llm: {
        backend: "noop",
        model: "none",
        candidatesSent: expect.any(Number),
      },
    });
    expect(report.layers?.heuristic.findings.length).toBeGreaterThan(0);
    expect(report.layers?.llm.findings).toEqual([]);
    expect(report.findings).toEqual(report.layers?.combined.findings);
  });
});

describe("runCli scan", () => {
  afterEach(cleanupFixture);

  it("prints a table and writes .tokenforge/scan-report.json", async () => {
    const captured = captureIo();
    const code = await runCli(
      [
        "scan",
        fixtureRoot,
        "--team",
        "payments-platform",
        "--repo",
        "fixtures/noisy-app",
      ],
      captured.io,
    );

    expect(code).toBe(0);
    expect(captured.stdout).toContain("package-lock.json");
    expect(captured.stdout).toContain("beforeTokens");
    expect(captured.stdout).toContain("wrote ");

    const written = JSON.parse(
      await readFile(resolve(fixtureRoot, ".tokenforge/scan-report.json"), "utf8"),
    ) as unknown;
    expect(isTokenRiskReport(written)).toBe(true);
    if (isTokenRiskReport(written)) {
      expect(written.totals.beforeTokens).toBeGreaterThan(0);
    }
  });

  it("returns usage exit code 2 for an unknown command", async () => {
    const captured = captureIo();
    const code = await runCli(["nope"], captured.io);
    expect(code).toBe(2);
    expect(captured.stderr).toContain("Unknown command");
  });
});
