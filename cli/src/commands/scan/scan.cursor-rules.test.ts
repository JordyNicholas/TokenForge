import { isTokenRiskReport, selectEnrichmentCandidates } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { cursorRulesAppRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

describe("scanRepo (cursor-rules-app, .cursor instruction stack)", () => {
  it("walks .cursor/rules and project MCP config but skips ephemeral cache", async () => {
    const { report, assessments } = await scanRepo({
      root: cursorRulesAppRoot,
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    const paths = assessments.map((assessment) => assessment.path);
    expect(paths).toContain(".cursor/rules/demo.mdc");
    expect(paths).toContain(".cursor/mcp.json");
    expect(paths).not.toContain(".cursor/cache/ephemeral.txt");
  });

  it("prioritizes .cursor/rules for hybrid enrichment candidates", async () => {
    const { assessments } = await scanRepo({ root: cursorRulesAppRoot });
    const candidates = selectEnrichmentCandidates(assessments);

    expect(candidates.map((candidate) => candidate.path)).toContain(
      ".cursor/rules/demo.mdc",
    );
  });
});
