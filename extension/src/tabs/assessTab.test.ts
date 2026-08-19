import { INACTIVE_MS } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { assessTab } from "./assessTab";

describe("assessTab", () => {
  const nowMs = 1_000_000;

  it("flags lockfiles as at-risk immediately", () => {
    const result = assessTab(
      { path: "fixtures/noisy-app/package-lock.json", bytes: 2_400_000, lastActivityAt: nowMs },
      nowMs,
    );

    expect(result.atRisk).toBe(true);
    expect(result.reasons).toContain("high_risk_filetype");
  });

  it("does not flag active source tabs before 15 minutes idle", () => {
    const result = assessTab(
      { path: "src/app.ts", bytes: 1_200, lastActivityAt: nowMs - INACTIVE_MS + 1 },
      nowMs,
    );

    expect(result.atRisk).toBe(false);
    expect(result.reasons).not.toContain("inactive_tab");
  });

  it("flags source tabs at 15 minutes idle", () => {
    const result = assessTab(
      { path: "src/app.ts", bytes: 1_200, lastActivityAt: nowMs - INACTIVE_MS },
      nowMs,
    );

    expect(result.atRisk).toBe(true);
    expect(result.reasons).toContain("inactive_tab");
  });
});
