import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { computeProvePackCoverage, rollupProvePack } from "./prove-pack";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function tempRoot(prefix: string): string {
  const root = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  roots.push(root);
  return root;
}

const sampleReport = (team: string, repo: string, saved: number) => ({
  source: "cli",
  timestamp: "2026-01-01T00:00:00.000Z",
  team,
  repo,
  provider: "generic",
  findings: [],
  totals: { beforeTokens: saved + 10, afterTokens: 10, savedTokens: saved },
});

const sampleMarker = (team: string) => ({
  timestamp: "2026-02-01T00:00:00.000Z",
  provider: "copilot",
  packId: "apply:copilot",
  action: "apply" as const,
  team,
  repo: `${team}-repo`,
});

const sampleSession = (team: string, repo: string) => ({
  source: "extension",
  timestamp: "2026-09-04T12:00:00.000Z",
  repo,
  team,
  sessionAvoidedTokens: 500,
  sessionHistory: [
    {
      path: "package-lock.json",
      estTokens: 200,
      reason: "high_risk_filetype",
      filteredAt: "2026-09-04T11:00:00.000Z",
    },
  ],
  atRiskTabsFilteredPercent: 40,
  filterEventCount: 2,
});

describe("computeProvePackCoverage", () => {
  it("flags missing scans and sessions against roster", () => {
    const coverage = computeProvePackCoverage(
      { teams: [{ id: "payments" }, { id: "checkout" }, { id: "platform" }] },
      {
        businessUnit: "BU",
        reports: [sampleReport("payments", "pay-api", 100)],
      },
      [{ team: "payments", repo: "pay-api", label: "a", stats: {} }],
    );
    expect(coverage.missingScans).toEqual(["checkout", "platform"]);
    expect(coverage.missingSessions).toEqual(["checkout", "platform"]);
    expect(coverage.presentScanTeams).toEqual(["payments"]);
    expect(coverage.presentSessionTeams).toEqual(["payments"]);
  });
});

describe("rollupProvePack", () => {
  it("walks inbox layout and writes org-prove-pack.json", async () => {
    const root = tempRoot("tf-prove-pack");
    const paymentsDir = join(root, "inbox", "payments", "pay-api", ".tokenforge");
    const checkoutDir = join(root, "inbox", "checkout", "cart", ".tokenforge");
    await mkdir(paymentsDir, { recursive: true });
    await mkdir(checkoutDir, { recursive: true });

    await writeFile(
      join(paymentsDir, "scan-report.json"),
      `${JSON.stringify(sampleReport("payments", "pay-api", 100), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(paymentsDir, "prove-change-latest.json"),
      `${JSON.stringify(sampleMarker("payments"), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(paymentsDir, "session-stats.json"),
      `${JSON.stringify(sampleSession("payments", "pay-api"), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(paymentsDir, "discover-latest.json"),
      `${JSON.stringify(
        {
          missedTokens: 120,
          opportunities: [
            { path: "logs/app.log", estTokens: 80, category: "policy_gap" },
            { path: "tmp/cache.bin", estTokens: 40, category: "session_kept" },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      join(checkoutDir, "last-scan.json"),
      `${JSON.stringify(sampleReport("checkout", "cart", 50), null, 2)}\n`,
      "utf8",
    );

    const rosterPath = join(root, "roster.json");
    await writeFile(
      rosterPath,
      `${JSON.stringify({ schemaVersion: 1, teams: [{ id: "payments" }, { id: "checkout" }, { id: "platform" }] }, null, 2)}\n`,
      "utf8",
    );

    const outPath = join(root, "bu-prove-pack.json");
    const result = await rollupProvePack({
      root,
      businessUnit: "Retail Banking",
      out: outPath,
      roster: rosterPath,
    });

    expect(result.reportCount).toBe(2);
    expect(result.markerCount).toBe(1);
    expect(result.sessionCount).toBe(1);
    expect(result.discoverCount).toBe(1);
    expect(result.outPath).toBe(outPath);
    expect(result.pack.schemaVersion).toBe(1);
    expect(result.pack.seed.businessUnit).toBe("Retail Banking");
    expect(result.pack.markers[0]?.team).toBe("payments");
    expect(result.pack.sessions[0]).toMatchObject({
      team: "payments",
      repo: "pay-api",
    });
    expect(result.pack.discovers[0]?.summary).toEqual({
      missedTokens: 120,
      policyGapCount: 1,
      sessionKeptCount: 1,
      opportunitiesCount: 2,
    });
    expect(result.pack.coverage?.missingScans).toEqual(["platform"]);
    expect(result.pack.coverage?.missingSessions).toEqual(["checkout", "platform"]);
  });
});
