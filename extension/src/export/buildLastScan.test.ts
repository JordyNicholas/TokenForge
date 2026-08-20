import { estimateTokens, isTokenRiskReport } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { TabRegistry } from "../tabs/registry";
import { assertValidLastScan, buildLastScanReport } from "./buildLastScan";

describe("buildLastScanReport", () => {
  it("marks filtered tabs as saved and validates against the v0 contract", () => {
    const registry = new TabRegistry();
    const now = Date.now();

    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );
    registry.upsert(
      "file:///src",
      { path: "src/app.ts", bytes: 400, focus: true },
      now,
    );

    const decisions = new Map([
      ["file:///lock", "filtered" as const],
      ["file:///src", "pending" as const],
    ]);

    const report = assertValidLastScan(
      buildLastScanReport({
        tabs: registry.list(now),
        decisionFor: (uri) => decisions.get(uri) ?? "pending",
        repo: "TokenForge",
        team: "payments-platform",
        provider: "generic",
        timestamp: "2026-08-20T12:00:00.000Z",
      }),
    );

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.source).toBe("extension");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      path: "package-lock.json",
      action: "filtered",
      reason: "high_risk_filetype",
    });

    const lockTokens = estimateTokens(4_000);
    const srcTokens = estimateTokens(400);
    expect(report.totals).toEqual({
      beforeTokens: lockTokens + srcTokens,
      afterTokens: srcTokens,
      savedTokens: lockTokens,
    });
  });

  it("exports kept for pending and kept decisions", () => {
    const registry = new TabRegistry();
    const now = Date.now();
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );

    const kept = buildLastScanReport({
      tabs: registry.list(now),
      decisionFor: () => "kept",
      repo: "repo",
      team: "team",
      provider: "cursor",
      timestamp: "2026-08-20T12:00:00.000Z",
    });
    const pending = buildLastScanReport({
      tabs: registry.list(now),
      decisionFor: () => "pending",
      repo: "repo",
      team: "team",
      provider: "cursor",
      timestamp: "2026-08-20T12:00:00.000Z",
    });

    expect(kept.findings[0]?.action).toBe("kept");
    expect(pending.findings[0]?.action).toBe("kept");
    expect(kept.totals.savedTokens).toBe(0);
  });
});
