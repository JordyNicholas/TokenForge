import { describe, expect, it } from "vitest";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { lastScanFingerprint } from "./lastScanFingerprint";

function report(overrides: Partial<TokenRiskReport> = {}): TokenRiskReport {
  return {
    source: "extension",
    timestamp: "2026-08-21T12:00:00.000Z",
    repo: "demo",
    team: "default",
    provider: "generic",
    findings: [],
    totals: { beforeTokens: 10, afterTokens: 10, savedTokens: 0 },
    ...overrides,
  };
}

describe("lastScanFingerprint", () => {
  it("ignores timestamp-only changes", () => {
    const a = lastScanFingerprint(report({ timestamp: "2026-08-21T12:00:00.000Z" }));
    const b = lastScanFingerprint(report({ timestamp: "2026-08-21T12:01:00.000Z" }));
    expect(a).toBe(b);
  });

  it("changes when totals change", () => {
    const a = lastScanFingerprint(report());
    const b = lastScanFingerprint(
      report({ totals: { beforeTokens: 20, afterTokens: 10, savedTokens: 10 } }),
    );
    expect(a).not.toBe(b);
  });
});
