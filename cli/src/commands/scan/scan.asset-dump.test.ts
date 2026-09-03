import { describe, expect, it } from "vitest";
import { scanRepo } from "./scan";
import { assetDumpAppRoot } from "../../test/helpers";

describe("scan on asset-dump-app", () => {
  it("speaks for asset directories instead of their files", async () => {
    const { report } = await scanRepo({ root: assetDumpAppRoot });
    const paths = report.findings.map((finding) => finding.path).sort();

    // 40 files, 7 findings. Without the fold this report carries 34.
    expect(report.findings).toHaveLength(7);
    expect(paths).toEqual([
      "assets/brand/logo.svg",
      "assets/icons/**",
      "assets/logos/mark.png",
      "assets/logos/square.png",
      "assets/logos/stacked.png",
      "assets/logos/wordmark.png",
      "press-kit/**",
    ]);
  });

  it("folds the outermost safe directory, once", async () => {
    const { report, assessments } = await scanRepo({ root: assetDumpAppRoot });
    const pressKit = report.findings.find((finding) => finding.path === "press-kit/**")!;

    // 9 direct + 9 under `screens/`, all of it accounted for in one finding.
    expect(pressKit.estTokens).toBe(
      assessments
        .filter((assessment) => assessment.path.startsWith("press-kit/"))
        .reduce((sum, assessment) => sum + assessment.estTokens, 0),
    );
    expect(
      report.findings.some((finding) => finding.path.startsWith("press-kit/screens")),
    ).toBe(false);
  });

  it("never folds a directory with source below it", async () => {
    const { report } = await scanRepo({ root: assetDumpAppRoot });
    const paths = report.findings.map((finding) => finding.path);

    // `assets/brand/palette.ts` vetoes its own directory and every ancestor.
    expect(paths).toContain("assets/brand/logo.svg");
    expect(paths).not.toContain("assets/brand/**");
    expect(paths).not.toContain("assets/**");
  });

  it("reports every reason it uses truthfully", async () => {
    const { report, assessments } = await scanRepo({ root: assetDumpAppRoot });

    // Nothing here is close to OVERSIZED_BYTES, so `oversized` would be a lie —
    // and the fold only fires on a media supermajority, so the class holds for
    // the directory the same way it holds for a file.
    for (const finding of report.findings) {
      expect(finding.reason).toBe("high_risk_filetype");
      expect(finding.action).toBe("excluded");
    }
    const largestAsset = Math.max(
      ...assessments
        .filter((assessment) => assessment.fileClass === "media")
        .map((assessment) => assessment.bytes),
    );
    expect(largestAsset).toBeLessThan(2_000);
  });

  it("charges a folded subtree to savedTokens", async () => {
    const { report, assessments } = await scanRepo({ root: assetDumpAppRoot });
    const { beforeTokens, afterTokens, savedTokens } = report.totals;

    // The fold matches no assessment by name, so totals have to resolve it as a
    // prefix or the saving is banked twice / not at all.
    expect(beforeTokens).toBe(
      assessments.reduce((sum, assessment) => sum + assessment.estTokens, 0),
    );
    expect(savedTokens).toBe(
      report.findings.reduce((sum, finding) => sum + finding.estTokens, 0),
    );
    expect(afterTokens).toBe(beforeTokens - savedTokens);
  });
});
