import { estimateTokens } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { SessionLedger } from "./sessionLedger";

describe("SessionLedger", () => {
  it("accumulates tokens avoided across filter events", () => {
    const ledger = new SessionLedger();

    ledger.recordFilter({
      uri: "file:///lock",
      path: "package-lock.json",
      estTokens: estimateTokens(4_000),
      reason: "high_risk_filetype",
    });
    ledger.recordFilter({
      uri: "file:///bundle",
      path: "dist/bundle.js",
      estTokens: estimateTokens(8_000),
      reason: "high_risk_filetype",
    });

    expect(ledger.totalAvoided()).toBe(
      estimateTokens(4_000) + estimateTokens(8_000),
    );
    expect(ledger.list()).toHaveLength(2);
  });

  it("does not double-count re-filter on the same uri", () => {
    const ledger = new SessionLedger();
    const tokens = estimateTokens(4_000);

    ledger.recordFilter({
      uri: "file:///lock",
      path: "package-lock.json",
      estTokens: tokens,
      reason: "high_risk_filetype",
    });
    ledger.recordFilter({
      uri: "file:///lock",
      path: "package-lock.json",
      estTokens: tokens,
      reason: "high_risk_filetype",
    });

    expect(ledger.totalAvoided()).toBe(tokens);
    expect(ledger.list()).toHaveLength(1);
  });

  it("remove subtracts a restored filter from session total", () => {
    const ledger = new SessionLedger();
    const tokens = estimateTokens(4_000);

    ledger.recordFilter({
      uri: "file:///lock",
      path: "package-lock.json",
      estTokens: tokens,
      reason: "high_risk_filetype",
    });
    ledger.remove("file:///lock");

    expect(ledger.totalAvoided()).toBe(0);
    expect(ledger.list()).toHaveLength(0);
  });

  it("clearAll resets the session ledger", () => {
    const ledger = new SessionLedger();

    ledger.recordFilter({
      uri: "file:///a",
      path: "a.lock",
      estTokens: 100,
      reason: "high_risk_filetype",
    });
    ledger.recordFilter({
      uri: "file:///b",
      path: "b.lock",
      estTokens: 200,
      reason: "high_risk_filetype",
    });
    ledger.clearAll();

    expect(ledger.totalAvoided()).toBe(0);
    expect(ledger.list()).toHaveLength(0);
  });

  it("keeps entries after remove of unrelated uri", () => {
    const ledger = new SessionLedger();

    ledger.recordFilter({
      uri: "file:///a",
      path: "a.lock",
      estTokens: 100,
      reason: "high_risk_filetype",
    });
    ledger.recordFilter({
      uri: "file:///b",
      path: "b.lock",
      estTokens: 200,
      reason: "high_risk_filetype",
    });
    ledger.remove("file:///a");

    expect(ledger.totalAvoided()).toBe(200);
    expect(ledger.list().map((entry) => entry.path)).toEqual(["b.lock"]);
  });

  it("lists newest filter first", () => {
    const ledger = new SessionLedger();

    ledger.recordFilter(
      {
        uri: "file:///a",
        path: "a.lock",
        estTokens: 100,
        reason: "high_risk_filetype",
      },
      1_000,
    );
    ledger.recordFilter(
      {
        uri: "file:///b",
        path: "b.lock",
        estTokens: 200,
        reason: "high_risk_filetype",
      },
      2_000,
    );

    expect(ledger.list().map((entry) => entry.path)).toEqual(["b.lock", "a.lock"]);
  });
});
