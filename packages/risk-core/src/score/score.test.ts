import { describe, expect, it } from "vitest";
import {
  AUXILIARY_OVERSIZED_BYTES,
  INACTIVE_MS,
  OVERSIZED_BYTES,
} from "../domain/constants";
import { primaryReason, heuristicFindingAction, scoreRisk } from "./score";


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

  it("flags build artifact dist paths", () => {
    const result = scoreRisk({
      path: "dist/bundle.js",
      bytes: 50_000,
      inactiveMs: 0,
    });

    expect(result.fileClass).toBe("build_artifact");
    expect(result.reasons).toContain("high_risk_filetype");
    expect(result.atRisk).toBe(true);
  });

  it("flags inactive source tabs at the focused idle threshold", () => {
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

  it("flags background tabs earlier via inactiveThresholdMs", () => {
    const backgroundThreshold = INACTIVE_MS / 2;
    const result = scoreRisk({
      path: "src/app.ts",
      bytes: 1_200,
      inactiveMs: backgroundThreshold,
      inactiveThresholdMs: backgroundThreshold,
    });

    expect(result.reasons).toEqual(["inactive_tab"]);
    expect(
      scoreRisk({
        path: "src/app.ts",
        bytes: 1_200,
        inactiveMs: backgroundThreshold,
      }).atRisk,
    ).toBe(false);
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

  describe("protected paths (#135)", () => {
    it("does not flag an oversized build config the agent needs", () => {
      const result = scoreRisk({
        path: "tsconfig.json",
        bytes: OVERSIZED_BYTES * 2,
        inactiveMs: 0,
      });

      expect(result.atRisk).toBe(false);
      expect(result.reasons).toEqual([]);
      expect(result.protection).toBe("protected_config");
    });

    it("does not flag a large API contract — size tracks completeness here", () => {
      const result = scoreRisk({
        path: "docs/openapi.json",
        bytes: OVERSIZED_BYTES * 3,
        inactiveMs: 0,
      });

      expect(result.atRisk).toBe(false);
      expect(result.protection).toBe("api_contract");
    });

    it("keeps a generated API client out of the high-risk class but still flags its size", () => {
      const small = scoreRisk({
        path: "src/generated/graphql/schema.json",
        bytes: 5_000,
        inactiveMs: 0,
      });
      expect(small.fileClass).toBe("generated");
      expect(small.atRisk).toBe(false);
      expect(small.protection).toBe("necessary_generated");

      // Protection covers the class, not the size — an enormous schema is
      // still worth surfacing.
      const huge = scoreRisk({
        path: "src/generated/graphql/schema.json",
        bytes: OVERSIZED_BYTES,
        inactiveMs: 0,
      });
      expect(huge.reasons).toEqual(["oversized"]);
      expect(huge.atRisk).toBe(true);
    });

    it("still flags an ordinary generated tree", () => {
      const result = scoreRisk({
        path: "generated/styles/theme.css",
        bytes: 5_000,
        inactiveMs: 0,
      });

      expect(result.reasons).toContain("high_risk_filetype");
      expect(result.protection).toBeUndefined();
    });

    it("flags auxiliary fixture data at the lower size bar", () => {
      const auxiliary = scoreRisk({
        path: "test/fixtures/recorded-orders.json",
        bytes: AUXILIARY_OVERSIZED_BYTES,
        inactiveMs: 0,
      });
      expect(auxiliary.reasons).toEqual(["oversized"]);

      // Identical size, ordinary location: still under the flat bar.
      const ordinary = scoreRisk({
        path: "config/orders.json",
        bytes: AUXILIARY_OVERSIZED_BYTES,
        inactiveMs: 0,
      });
      expect(ordinary.atRisk).toBe(false);
    });

    it("leaves inactive_tab intact — protection is about exclusion, not IDE hygiene", () => {
      const result = scoreRisk({
        path: "tsconfig.json",
        bytes: OVERSIZED_BYTES * 2,
        inactiveMs: INACTIVE_MS,
      });

      expect(result.reasons).toEqual(["inactive_tab"]);
      expect(result.atRisk).toBe(true);
    });
  });
});

describe("heuristicFindingAction", () => {
  it("keeps oversized-only application source out of Fix exclusions (B2)", () => {
    const assessment = scoreRisk({
      path: "src/generated-types.ts",
      bytes: OVERSIZED_BYTES + 1,
      inactiveMs: 0,
    });
    expect(assessment.fileClass).toBe("source");
    expect(heuristicFindingAction(assessment, "oversized")).toBe("kept");
  });

  it("still excludes oversized config and high-risk filetypes", () => {
    const config = scoreRisk({
      path: "config/locales.json",
      bytes: OVERSIZED_BYTES + 1,
      inactiveMs: 0,
    });
    expect(heuristicFindingAction(config, "oversized")).toBe("excluded");

    const lockfile = scoreRisk({
      path: "package-lock.json",
      bytes: OVERSIZED_BYTES + 1,
      inactiveMs: 0,
    });
    expect(heuristicFindingAction(lockfile, "high_risk_filetype")).toBe("excluded");
  });

  it("excludes source when oversized is not the sole reason", () => {
    const assessment = scoreRisk({
      path: "src/app.ts",
      bytes: OVERSIZED_BYTES + 1,
      inactiveMs: INACTIVE_MS,
    });
    expect(assessment.reasons).toContain("oversized");
    expect(assessment.reasons).toContain("inactive_tab");
    expect(heuristicFindingAction(assessment, "oversized")).toBe("excluded");
  });

  it("flags a tiny asset — media clears no size bar", () => {
    // The whole point of the class: 259 of `tabler`'s 260 flag SVGs sit far
    // under OVERSIZED_BYTES, and before this they produced nothing at all.
    const result = scoreRisk({
      path: "shared/static/brands/dropbox.svg",
      bytes: 375,
      inactiveMs: 0,
    });

    expect(result.fileClass).toBe("media");
    expect(result.atRisk).toBe(true);
    expect(result.reasons).toEqual(["high_risk_filetype"]);
    expect(primaryReason(result.reasons)).toBe("high_risk_filetype");
    expect(heuristicFindingAction(result, "high_risk_filetype")).toBe("excluded");
  });

  it("scores a small asset well above a same-size unknown text file", () => {
    const asset = scoreRisk({ path: "docs/assets/favicon.ico", bytes: 4_000, inactiveMs: 0 });
    const prose = scoreRisk({ path: "docs/NOTES.md", bytes: 4_000, inactiveMs: 0 });

    // B3: the continuous score has to agree with `reasons`, or the two halves
    // of the heuristic disagree about the same file.
    expect(asset.score).toBeGreaterThan(prose.score);
    expect(prose.atRisk).toBe(false);
  });
});
