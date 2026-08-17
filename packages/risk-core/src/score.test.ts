import { describe, expect, it } from "vitest";
import { INACTIVE_MS, OVERSIZED_BYTES } from "./constants";
import { primaryReason, scoreRisk } from "./score";

describe("scoreRisk", () => {
  it("flags lockfiles as high-risk even when recently active", () => {
    const result = scoreRisk({
      path: "package-lock.json",
      bytes: 2_400_000,
      inactiveMs: 0,
    });

    expect(result.fileClass).toBe("lockfile");
    expect(result.atRisk).toBe(true);
    expect(result.reasons).toEqual(["high_risk_filetype", "oversized"]);
    expect(result.estTokens).toBe(600_000);
    expect(primaryReason(result.reasons)).toBe("high_risk_filetype");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("flags generated dist paths", () => {
    const result = scoreRisk({
      path: "dist/bundle.js",
      bytes: 50_000,
      inactiveMs: 0,
    });

    expect(result.fileClass).toBe("generated");
    expect(result.reasons).toContain("high_risk_filetype");
    expect(result.atRisk).toBe(true);
  });

  it("flags inactive source tabs at 15 minutes", () => {
    const result = scoreRisk({
      path: "src/app.ts",
      bytes: 1_200,
      inactiveMs: INACTIVE_MS,
    });

    expect(result.fileClass).toBe("source");
    expect(result.reasons).toEqual(["inactive_tab"]);
    expect(result.atRisk).toBe(true);
    expect(result.score).toBeGreaterThan(
      scoreRisk({ path: "src/app.ts", bytes: 1_200, inactiveMs: 0 }).score,
    );
  });

  it("does not flag a small active source file", () => {
    const result = scoreRisk({
      path: "src/app.ts",
      bytes: 800,
      inactiveMs: INACTIVE_MS - 1,
    });

    expect(result.atRisk).toBe(false);
    expect(result.reasons).toEqual([]);
    expect(primaryReason(result.reasons)).toBeUndefined();
  });

  it("flags fat configs as oversized, not high-risk filetype", () => {
    const result = scoreRisk({
      path: "config/legacy-export.xml",
      bytes: OVERSIZED_BYTES,
      inactiveMs: 0,
    });

    expect(result.fileClass).toBe("config");
    expect(result.reasons).toEqual(["oversized"]);
    expect(result.atRisk).toBe(true);
  });

  it("scores lockfiles higher than source of the same size", () => {
    const input = { bytes: 8_000, inactiveMs: 0 };
    const lockfile = scoreRisk({ ...input, path: "package-lock.json" });
    const source = scoreRisk({ ...input, path: "src/index.ts" });
    expect(lockfile.score).toBeGreaterThan(source.score);
  });
});
