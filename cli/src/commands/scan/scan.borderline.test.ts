import { isTokenRiskReport, selectEnrichmentCandidates } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { borderlineAppRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

describe("scanRepo (borderline-app, precision stress test)", () => {
  it("keeps oversized-only source in context while still flagging oversized config (B2)", async () => {
    const { report } = await scanRepo({
      root: borderlineAppRoot,
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.findings).toHaveLength(2);

    const types = report.findings.find((finding) => finding.path === "src/generated-types.ts");
    expect(types).toMatchObject({ reason: "oversized", action: "kept" });

    const locales = report.findings.find((finding) => finding.path === "config/locales.json");
    expect(locales).toMatchObject({ reason: "oversized", action: "excluded" });

    expect(report.findings.some((finding) => finding.path === "src/index.ts")).toBe(false);
    expect(report.findings.some((finding) => finding.path === "rules/pricing-notes.md")).toBe(
      false,
    );
  });

  it("still prioritizes rules/pricing-notes.md for LLM enrichment on segment-name alone (docs/design/HEURISTICS_AUDIT.md B1)", async () => {
    const { assessments } = await scanRepo({ root: borderlineAppRoot });
    const candidates = selectEnrichmentCandidates(assessments);

    expect(candidates[0]).toMatchObject({
      path: "rules/pricing-notes.md",
      atRisk: false,
    });
  });
});
