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

  it("also surfaces most of the duplicate source-code pairs as candidates via the source-fairness bucket (B8)", async () => {
    const { assessments } = await scanRepo({ root: semanticDuplicatesAppRoot });
    const candidates = selectEnrichmentCandidates(assessments);
    const candidatePaths = candidates.map((candidate) => candidate.path);

    // The real regression proof for B8 is
    // packages/risk-core/src/candidates/candidates.test.ts, which shapes a
    // repo where small source files would otherwise be crowded out entirely.
    // This fixture only has 7 source files total (6 duplicates + the
    // src/index.js control), one more than the default sourceTopCount (5),
    // so — honestly, not by design — the single smallest duplicate file
    // (isValidEmail.js, 193 bytes) misses the guarantee bucket here, same as
    // the control file. That's the bucket's bounded budget working as
    // intended, not a bug: this is a fairness improvement, not a promise
    // that every source file in every repo becomes a candidate.
    expect(candidatePaths).toEqual(
      expect.arrayContaining([
        "src/utils/checkEmailFormat.js",
        "src/format/formatCurrency.js",
        "src/helpers/toMoneyString.js",
        "src/http/fetchWithRetry.js",
        "src/network/retryRequest.js",
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
