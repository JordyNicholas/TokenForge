import { estimateTokens } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { TabFilterStore } from "../filter/filterStore";
import { TabRegistry } from "../tabs/registry";
import { RiskSession } from "./riskSession";

describe("RiskSession", () => {
  it("drops filtered tabs from displayed at-risk tokens", () => {
    const registry = new TabRegistry();
    const filters = new TabFilterStore();
    const session = new RiskSession(registry, filters);
    const now = Date.now();

    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );
    registry.upsert(
      "file:///bundle",
      { path: "dist/bundle.js", bytes: 8_000, focus: true },
      now,
    );

    const before = session.displayAtRiskTokens(now);
    expect(before).toBe(estimateTokens(4_000) + estimateTokens(8_000));

    session.filter("file:///lock");

    expect(session.displayAtRiskTokens(now)).toBe(estimateTokens(8_000));
    expect(session.listDisplayAtRisk(now).map((tab) => tab.path)).toEqual([
      "dist/bundle.js",
    ]);
  });

  it("keep does not reduce displayed at-risk tokens", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry);
    const now = Date.now();

    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );

    const before = session.displayAtRiskTokens(now);
    session.keep("file:///lock");

    expect(session.decision("file:///lock")).toBe("kept");
    expect(session.displayAtRiskTokens(now)).toBe(before);
    expect(session.listDisplayAtRisk(now)).toHaveLength(1);
  });

  it("clears filter decisions when asked", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry);
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      Date.now(),
    );

    session.filter("file:///lock");
    session.clearDecision("file:///lock");

    expect(session.decision("file:///lock")).toBe("pending");
    expect(session.listDisplayAtRisk()).toHaveLength(1);
  });
});
