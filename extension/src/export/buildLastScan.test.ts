import { estimateTokens, isTokenRiskReport } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { TabRegistry } from "../tabs/registry";
import { assertValidLastScan, buildLastScanReport } from "./buildLastScan";

describe("buildLastScanReport", () => {
  it("marks filtered tabs as saved and validates against the Token Risk contract", () => {
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

  describe("activePaths (#137)", () => {
    it("lists every open tab, at risk or not", () => {
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

      const report = buildLastScanReport({
        tabs: registry.list(now),
        decisionFor: () => "pending",
        repo: "TokenForge",
        team: "payments-platform",
        provider: "generic",
      });

      // The lockfile is at risk and the source file is not; both are open, so
      // both are part of the session signal.
      expect(report.activePaths).toEqual(["package-lock.json", "src/app.ts"]);
    });

    it("includes an idle tab — idle is not grounds for a repo-wide exclusion", () => {
      const registry = new TabRegistry();
      const now = Date.now();
      registry.upsert(
        "file:///locales",
        { path: "locales/en.json", bytes: 200_000, focus: true },
        now - 60 * 60 * 1000,
      );

      const report = buildLastScanReport({
        tabs: registry.list(now),
        decisionFor: () => "pending",
        repo: "TokenForge",
        team: "payments-platform",
        provider: "generic",
      });

      expect(report.activePaths).toEqual(["locales/en.json"]);
    });

    it("omits the field entirely when no tabs are open", () => {
      const report = buildLastScanReport({
        tabs: [],
        decisionFor: () => "pending",
        repo: "TokenForge",
        team: "payments-platform",
        provider: "generic",
      });

      // Absent means "unknown". An empty array would claim the developer has
      // nothing open, which is a different and stronger statement.
      expect(report.activePaths).toBeUndefined();
      expect(isTokenRiskReport(report)).toBe(true);
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

  it("emits hybrid layers when LLM findings are supplied", () => {
    const registry = new TabRegistry();
    const now = Date.now();
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );

    const report = assertValidLastScan(
      buildLastScanReport({
        tabs: registry.list(now),
        decisionFor: () => "filtered",
        repo: "repo",
        team: "team",
        provider: "generic",
        timestamp: "2026-08-20T12:00:00.000Z",
        llmFindings: [
          {
            path: "AGENTS.md",
            reason: "redundant_instructions",
            bytes: 800,
            estTokens: 200,
            action: "excluded",
            source: "llm",
          },
        ],
        llmMeta: {
          backend: "noop",
          model: "none",
          durationMs: 1,
          candidatesSent: 1,
        },
        llmCandidateTokens: 200,
      }),
    );

    expect(report.scan?.mode).toBe("hybrid");
    expect(report.layers?.llm.findings).toHaveLength(1);
    expect(report.findings.some((finding) => finding.source === "llm")).toBe(true);
  });
});
