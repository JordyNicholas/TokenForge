import { isTokenRiskReport, selectEnrichmentCandidates } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { instructionsAppRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

// No cleanupFixture(Fixture) call in this file: scanRepo() never writes to
// disk (only `runCli scan` does), and this fixture ships a real
// `.github/copilot-instructions.md` as source content that the shared
// cleanup helper would delete if pointed at this root.
describe("scanRepo (instructions-app, hybrid candidate selection)", () => {
  it("flags repeated instruction paragraphs in the heuristic layer without savings", async () => {
    const { report, assessments } = await scanRepo({
      root: instructionsAppRoot,
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.totals.savedTokens).toBe(0);
    expect(assessments.every((assessment) => !assessment.atRisk)).toBe(true);
    expect(report.instructionBudget?.stackTokens).toBeGreaterThan(0);
    expect(
      report.findings.some(
        (finding) =>
          finding.source === "heuristic" &&
          finding.reason === "semantic_bloat" &&
          finding.action === "kept" &&
          finding.detail?.includes("Repeated paragraph"),
      ),
    ).toBe(true);
  });

  it("prioritizes all four instruction files for LLM enrichment", async () => {
    const { assessments } = await scanRepo({ root: instructionsAppRoot });
    const candidates = selectEnrichmentCandidates(assessments);
    const candidatePaths = candidates.map((candidate) => candidate.path);

    expect(candidatePaths.slice(0, 4)).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        "CLAUDE.md",
        ".cursorrules",
        ".github/copilot-instructions.md",
      ]),
    );
  });

  it("records hybrid scan metadata with the noop enricher", async () => {
    const { report } = await scanRepo({
      root: instructionsAppRoot,
      mode: "hybrid",
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(report.scan).toMatchObject({ mode: "hybrid", llm: { backend: "noop" } });
    expect(report.layers?.llm.findings).toEqual([]);
  });
});
