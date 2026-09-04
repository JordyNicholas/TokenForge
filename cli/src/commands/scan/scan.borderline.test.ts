import { isTokenRiskReport, selectEnrichmentCandidates } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { borderlineAppRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

describe("scanRepo (borderline-app, precision stress test)", () => {
  it("flags oversized config but not hand-maintained source below the source bar (B2/B3)", async () => {
    const { report } = await scanRepo({
      root: borderlineAppRoot,
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.findings).toHaveLength(1);

    const locales = report.findings.find((finding) => finding.path === "config/locales.json");
    expect(locales).toMatchObject({ reason: "oversized", action: "excluded" });

    expect(report.findings.some((finding) => finding.path === "src/generated-types.ts")).toBe(
      false,
    );
    expect(report.findings.some((finding) => finding.path === "src/index.ts")).toBe(false);
    expect(report.findings.some((finding) => finding.path === "rules/pricing-notes.md")).toBe(
      false,
    );
  });

  it("does not prioritize rules/pricing-notes.md for LLM enrichment (B1)", async () => {
    const { assessments } = await scanRepo({ root: borderlineAppRoot });
    const candidates = selectEnrichmentCandidates(assessments);

    expect(candidates.some((item) => item.path === "rules/pricing-notes.md")).toBe(false);
    expect(candidates.some((item) => item.path.endsWith(".cursor/rules"))).toBe(false);
  });
});
