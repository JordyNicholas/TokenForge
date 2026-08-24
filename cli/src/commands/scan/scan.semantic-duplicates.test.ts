import { isTokenRiskReport, selectEnrichmentCandidates } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { semanticDuplicatesAppRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

// No cleanupFixture(Fixture) call in this file: scanRepo() never writes to
// disk (only `runCli scan` does), and this fixture ships a real
// `.github/copilot-instructions.md` as source content that the shared
// cleanup helper would delete if pointed at this root.
describe("scanRepo (semantic-duplicates-app, paraphrased redundancy stress test)", () => {
  it("does not flag paraphrased instruction files or duplicate source pairs in the heuristic layer alone", async () => {
    const { report, assessments } = await scanRepo({
      root: semanticDuplicatesAppRoot,
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.totals.savedTokens).toBe(0);
    expect(assessments.every((assessment) => !assessment.atRisk)).toBe(true);
  });

  it("prioritizes all four paraphrased instruction files for LLM enrichment, unaffected by wording", async () => {
    const { assessments } = await scanRepo({ root: semanticDuplicatesAppRoot });
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
      root: semanticDuplicatesAppRoot,
      mode: "hybrid",
      now: new Date("2026-08-20T18:00:00.000Z"),
    });

    expect(report.scan).toMatchObject({ mode: "hybrid", llm: { backend: "noop" } });
    expect(report.layers?.llm.findings).toEqual([]);
  });
});
