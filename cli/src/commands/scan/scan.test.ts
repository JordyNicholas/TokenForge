import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isTokenRiskReport } from "@tokenforge/risk-core";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("round-trips claude-code through the report contract", async () => {
    // The enricher seam keeps this deterministic: the adapter itself is covered
    // in packages/enrichers, and the real CLI in E2E_CLAUDE_CODE_ENRICH_TEST.md.
    const enrich = vi.fn(async () => ({
      findings: [
        {
          path: "AGENTS.md",
          reason: "redundant_instructions" as const,
          bytes: 900,
          estTokens: 225,
          action: "kept" as const,
          source: "llm" as const,
          confidence: 0.7,
        },
      ],
      meta: {
        backend: "claude-code" as const,
        model: "default",
        durationMs: 20_298,
        candidatesSent: 12,
      },
    }));

    const { report } = await scanRepo({
      root: fixtureRoot,
      mode: "hybrid",
      enricher: { id: "claude-code", enrich },
      now: new Date("2026-08-27T18:00:00.000Z"),
    });

    expect(enrich).toHaveBeenCalledOnce();
    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.scan).toMatchObject({
      mode: "hybrid",
      llm: { backend: "claude-code", model: "default", candidatesSent: 12 },
    });
    // An llm-only path reaches the combined layer, not just the llm one.
    expect(report.layers?.llm.findings).toHaveLength(1);
    expect(report.findings.some((finding) => finding.path === "AGENTS.md")).toBe(
      true,
    );
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
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    await cleanupFixture();
  });

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

  it("does not call an external enricher without explicit privacy consent", async () => {
    const captured = captureIo();

    const code = await runCli(
      ["scan", fixtureRoot, "--mode", "hybrid", "--llm", "codex"],
      captured.io,
    );

    expect(code).toBe(2);
    expect(captured.stderr).toContain("Privacy warning");
    expect(captured.stderr).toContain("--allow-external");
  });

  it("gates claude-code behind the same consent flag as codex", async () => {
    // Both CLI backends spawn a signed-in process, so neither may start on the
    // strength of the user having that CLI installed.
    const captured = captureIo();

    const code = await runCli(
      ["scan", fixtureRoot, "--mode", "hybrid", "--llm", "claude-code"],
      captured.io,
    );

    expect(code).toBe(2);
    expect(captured.stderr).toContain("Privacy warning");
    expect(captured.stderr).toContain("--allow-external");
    // The gate must trip before anything is spawned, so a machine with no
    // Claude Code installed still gets the consent message, not ENOENT.
    expect(captured.stderr).not.toContain("not installed");
  });

  it("suggests claude-code when --llm claude is misspelled", async () => {
    const captured = captureIo();

    const code = await runCli(
      ["scan", fixtureRoot, "--mode", "hybrid", "--llm", "claude"],
      captured.io,
    );

    expect(code).toBe(2);
    expect(captured.stderr).toContain('Did you mean "claude-code"?');
  });
});
