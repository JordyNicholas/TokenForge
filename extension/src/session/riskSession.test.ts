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

  it("lists pending, kept, and filtered sections separately", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry);
    const now = Date.now();

    registry.upsert(
      "file:///a",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );
    registry.upsert(
      "file:///b",
      { path: "dist/bundle.js", bytes: 8_000, focus: true },
      now,
    );
    registry.upsert(
      "file:///c",
      { path: "yarn.lock", bytes: 2_000, focus: true },
      now,
    );

    session.keep("file:///a");
    session.filter("file:///b");

    expect(session.listPendingAtRisk(now).map((tab) => tab.uri)).toEqual(["file:///c"]);
    expect(session.listKeptAtRisk(now).map((tab) => tab.uri)).toEqual(["file:///a"]);
    expect(session.listFilteredAtRisk(now).map((tab) => tab.uri)).toEqual(["file:///b"]);
    expect(session.pulse(now).totals.savedTokens).toBe(estimateTokens(8_000));
  });

  it("lists approaching-idle source tabs for the countdown section", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry);
    const now = 1_000_000;

    registry.upsert(
      "file:///src",
      { path: "src/app.ts", bytes: 400, focus: true },
      now - 3 * 60_000,
    );
    // Newest focus wins → src becomes background with 3m idle (5m background threshold).
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );

    const approaching = session.listApproachingIdle(now);
    expect(approaching.map((tab) => tab.path)).toEqual(["src/app.ts"]);
  });

  it("accumulates session avoided separately from live at-risk", () => {
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

    session.filter("file:///lock");
    expect(session.sessionAvoidedTokens()).toBe(estimateTokens(4_000));
    expect(session.displayAtRiskTokens(now)).toBe(estimateTokens(8_000));

    // Tab close clears the live filter decision but not session history.
    filters.clear("file:///lock");
    registry.remove("file:///lock");

    expect(session.displayAtRiskTokens(now)).toBe(estimateTokens(8_000));
    expect(session.sessionAvoidedTokens()).toBe(estimateTokens(4_000));
    expect(session.sessionHistory()).toHaveLength(1);
    expect(session.sessionHistory()[0]?.path).toBe("package-lock.json");
  });

  it("restore and clear decisions adjust the session ledger", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry);
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

    session.filter("file:///lock");
    session.filter("file:///bundle");
    expect(session.sessionAvoidedTokens()).toBe(
      estimateTokens(4_000) + estimateTokens(8_000),
    );

    session.keep("file:///lock");
    expect(session.sessionAvoidedTokens()).toBe(estimateTokens(8_000));

    session.clearAllDecisions();
    expect(session.sessionAvoidedTokens()).toBe(0);
    expect(session.sessionHistory()).toHaveLength(0);
  });

  it("rehydrate applies durable filter without double-counting the ledger", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry);
    const now = Date.now();

    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );

    session.filter("file:///lock");
    expect(session.sessionAvoidedTokens()).toBe(estimateTokens(4_000));

    session.clearDecision("file:///lock");
    expect(session.sessionAvoidedTokens()).toBe(0);

    session.rehydrate("file:///lock", "filtered");
    expect(session.decision("file:///lock")).toBe("filtered");
    expect(session.sessionAvoidedTokens()).toBe(0);
  });
});
