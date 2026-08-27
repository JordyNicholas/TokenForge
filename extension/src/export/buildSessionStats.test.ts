import { estimateTokens, isSessionStatsReport } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { TabFilterStore } from "../filter/filterStore";
import { TabRegistry } from "../tabs/registry";
import { RiskSession } from "../session/riskSession";
import { buildSessionStatsReport } from "./buildSessionStats";

describe("buildSessionStatsReport", () => {
  it("maps session ledger entries into the Prove handoff shape", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry, new TabFilterStore());
    const now = Date.now();

    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );
    session.filter("file:///lock");

    const report = buildSessionStatsReport({
      repo: "TokenForge",
      team: "default",
      timestamp: new Date(now).toISOString(),
      sessionAvoidedTokens: session.sessionAvoidedTokens(),
      sessionHistory: session.sessionHistory(),
    });

    expect(isSessionStatsReport(report)).toBe(true);
    expect(report.sessionAvoidedTokens).toBe(estimateTokens(4_000));
    expect(report.sessionHistory).toHaveLength(1);
    expect(report.sessionHistory[0]?.path).toBe("package-lock.json");
  });
});
