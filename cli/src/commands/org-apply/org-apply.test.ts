import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isProveChangeMarker, type TokenRiskReport } from "@tokenforge/risk-core";
import { writeScanReport } from "../../io/report-file";
import { scanReportPath } from "../../io/paths";
import { applyOrgRemote } from "./org-apply";

const sampleReport: TokenRiskReport = {
  source: "cli",
  timestamp: "2026-08-25T16:00:00.000Z",
  repo: "fixtures/noisy-app",
  team: "payments-platform",
  provider: "copilot",
  findings: [
    {
      path: "package-lock.json",
      reason: "high_risk_filetype",
      bytes: 1000,
      estTokens: 250,
      action: "excluded",
    },
    {
      path: "dist/bundle.js",
      reason: "high_risk_filetype",
      bytes: 2000,
      estTokens: 500,
      action: "excluded",
    },
  ],
  totals: { beforeTokens: 750, afterTokens: 0, savedTokens: 750 },
};

describe("org-apply", () => {
  it("fixture provider applies and writes a Prove change marker", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-org-apply-"));
    try {
      await writeScanReport(scanReportPath(root), sampleReport);
      const result = await applyOrgRemote({
        root,
        org: "acme",
        applyProvider: "fixture",
        provider: "copilot",
      });
      expect(result.apply.status).toBe("applied");
      expect(result.exclusionPaths.length).toBeGreaterThan(0);
      expect(result.stagedDir).toContain("org-apply");
      expect(isProveChangeMarker(result.changeMarker)).toBe(true);
      expect(result.changeMarker?.action).toBe("org-apply");

      const manifest = JSON.parse(
        await readFile(join(result.stagedDir!, "manifest.json"), "utf8"),
      ) as { status: string; org: string };
      expect(manifest).toMatchObject({ status: "applied", org: "acme" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("copilot provider returns manual (no public push API)", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-org-apply-"));
    try {
      const result = await applyOrgRemote({
        root,
        org: "acme",
        applyProvider: "copilot",
        provider: "copilot",
        report: sampleReport,
      });
      expect(result.apply.status).toBe("manual");
      expect(result.apply.message).toMatch(/No public GitHub API/i);
      expect(result.changeMarker?.action).toBe("org-apply");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("dry-run does not stage or mark", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-org-apply-dry-"));
    try {
      const result = await applyOrgRemote({
        root,
        org: "acme",
        applyProvider: "fixture",
        report: sampleReport,
        dryRun: true,
      });
      expect(result.apply.status).toBe("dry-run");
      expect(result.stagedDir).toBeNull();
      expect(result.changeMarker).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
