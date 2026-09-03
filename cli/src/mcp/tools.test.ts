import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  TOKENFORGE_APPLY_TOOL,
  TOKENFORGE_SCAN_TOOL,
  handleTokenforgeApply,
  handleTokenforgeScan,
  type McpToolDeps,
} from "./tools";

const sampleReport = {
  team: "local",
  repo: "demo",
  provider: "generic" as const,
  generatedAt: "2026-01-01T00:00:00.000Z",
  schemaVersion: 5 as const,
  scan: { mode: "heuristic" as const },
  totals: {
    beforeTokens: 1000,
    afterTokens: 700,
    savedTokens: 300,
    savedPercent: 30,
  },
  findings: [{ path: "big.md" }],
};

/**
 * What `resolvedRoot` will produce for `input` on the machine running the test.
 *
 * The tools normalise every root through `path.resolve`, which is
 * platform-dependent: `resolve("/repo")` is `/repo` on POSIX and `C:\repo` on
 * Windows. Asserting the POSIX literal pinned the suite to one OS (#196); the
 * behaviour worth asserting is that the root is normalised at all.
 */
function expectedRoot(input: string): string {
  return resolve(input);
}

function deps(overrides: Partial<McpToolDeps> = {}): McpToolDeps {
  return {
    scanRepo: vi.fn(async () => ({
      report: sampleReport,
      reportPath: "/repo/.tokenforge/scan-report.json",
      assessments: [],
    })),
    applyPolicy: vi.fn(async () => ({
      report: sampleReport,
      reportPath: "/repo/.tokenforge/scan-report.json",
      files: [],
      resolvedFiles: [],
      writes: [{ path: ".github/copilot-instructions.md", disposition: "merge" as const }],
      dryRun: false,
      changeMarker: {
        timestamp: "2026-01-01T00:00:00.000Z",
        provider: "copilot",
        packId: "apply:copilot",
        action: "apply" as const,
      },
    })),
    writeScanReport: vi.fn(async () => undefined),
    defaultRoot: () => "/cwd",
    ...overrides,
  };
}

describe("handleTokenforgeScan", () => {
  it("writes the scan report and returns totals", async () => {
    const mock = deps();

    const payload = await handleTokenforgeScan({ root: "/repo", mode: "hybrid" }, mock);

    expect(mock.scanRepo).toHaveBeenCalledWith(
      expect.objectContaining({ root: expectedRoot("/repo"), mode: "hybrid" }),
    );
    expect(mock.writeScanReport).toHaveBeenCalledWith(
      "/repo/.tokenforge/scan-report.json",
      sampleReport,
    );
    expect(payload).toMatchObject({
      reportPath: "/repo/.tokenforge/scan-report.json",
      findingsCount: 1,
      totals: sampleReport.totals,
      scan: { mode: "heuristic" },
    });
  });

  it("defaults root to the MCP server cwd", async () => {
    const mock = deps();

    await handleTokenforgeScan({}, mock);

    expect(mock.scanRepo).toHaveBeenCalledWith(
      expect.objectContaining({ root: expectedRoot("/cwd") }),
    );
  });
});

describe("handleTokenforgeApply", () => {
  it("returns planned writes and totals", async () => {
    const mock = deps();

    const payload = await handleTokenforgeApply(
      { root: "/repo", provider: "copilot", dryRun: true },
      mock,
    );

    expect(mock.applyPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        root: expectedRoot("/repo"),
        provider: "copilot",
        dryRun: true,
      }),
    );
    expect(payload.writes[0]).toMatchObject({
      path: ".github/copilot-instructions.md",
      disposition: "merge",
    });
    expect(payload.totals.savedTokens).toBe(300);
  });
});

describe("MCP tool names", () => {
  it("uses stable provider-agnostic tool ids", () => {
    expect(TOKENFORGE_SCAN_TOOL).toBe("tokenforge_scan");
    expect(TOKENFORGE_APPLY_TOOL).toBe("tokenforge_apply");
  });
});
