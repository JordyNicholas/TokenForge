import { estimateTokens } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { TabRegistry } from "../tabs/registry";
import { buildRiskPulseModel, hasTokenReduction } from "./riskPulse";

describe("buildRiskPulseModel", () => {
  it("shows saved tokens from filtered tabs and keeps display at-risk for the rest", () => {
    const registry = new TabRegistry();
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

    const model = buildRiskPulseModel(registry.list(now), (uri) =>
      uri === "file:///lock" ? "filtered" : "pending",
    );

    const lockTokens = estimateTokens(4_000);
    const bundleTokens = estimateTokens(8_000);

    expect(model.totals).toEqual({
      beforeTokens: lockTokens + bundleTokens,
      afterTokens: bundleTokens,
      savedTokens: lockTokens,
    });
    expect(model.displayAtRiskTokens).toBe(bundleTokens);
    expect(model.filteredCount).toBe(1);
    expect(model.pendingCount).toBe(1);
    expect(model.segments[0]?.path).toBe("dist/bundle.js");
    expect(hasTokenReduction(model)).toBe(true);
  });

  it("has no reduction evidence before the user Filters", () => {
    const registry = new TabRegistry();
    const now = Date.now();
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );

    const model = buildRiskPulseModel(registry.list(now), () => "pending");
    expect(model.totals.beforeTokens).toBe(model.totals.afterTokens);
    expect(hasTokenReduction(model)).toBe(false);
  });
});
