import { isTokenRiskReport, type TokenRiskFinding } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import type { LlmEnricher, LlmEnricherInput, LlmStructuredFinding } from "../../enrichers";
import { mapStructuredFindings } from "../../enrichers";
import {
  fixtureRoot,
  heuristicEdgeAppRoot,
  instructionsAppRoot,
  semanticDuplicatesAppRoot,
} from "../../test/helpers";
import { scanRepo } from "./scan";

const DUPLICATE_A = "src/utils/checkEmailFormat.js";
/**
 * DUPLICATE_A's paraphrase pair. Referenced only in prose: at 193 bytes it is
 * the smallest of the fixture's 7 source files, one more than
 * DEFAULT_SOURCE_CANDIDATE_COUNT (5), so it does not reach the candidate list.
 * See fixtures/semantic-duplicates-app/README.md.
 */
const DUPLICATE_B = "src/validators/isValidEmail.js";
/** A second real candidate, for the mixed kept/excluded batch. */
const OTHER_CANDIDATE = "src/network/retryRequest.js";

/**
 * Test double standing in for a real backend. Without ScanOptions.enricher the
 * hybrid path could only run against the noop backend, i.e. always with zero
 * findings — so nothing exercised the candidates → merge → layers → totals
 * wiring in scan.ts. Never registered in the production registry.
 */
function scriptedEnricher(
  findingsFor: (input: LlmEnricherInput) => TokenRiskFinding[],
  metaExtra?: Record<string, unknown>,
): LlmEnricher {
  return {
    id: "noop",
    async enrich(input) {
      return {
        findings: findingsFor(input),
        meta: {
          backend: "noop",
          model: input.model,
          durationMs: 12,
          candidatesSent: input.candidates.length,
          ...metaExtra,
        },
      };
    },
  };
}

/** Applies the same safety gate production enrichers use via mapStructuredFindings. */
function structuredEnricher(
  rowsFor: (input: LlmEnricherInput) => readonly LlmStructuredFinding[],
): LlmEnricher {
  return {
    id: "noop",
    async enrich(input) {
      return {
        findings: mapStructuredFindings(rowsFor(input), input.candidates),
        meta: {
          backend: "noop",
          model: input.model,
          durationMs: 12,
          candidatesSent: input.candidates.length,
        },
      };
    },
  };
}

/** Look up a candidate's real token estimate so assertions use true numbers. */
function candidateTokens(input: LlmEnricherInput, path: string): number {
  const candidate = input.candidates.find((item) => item.path === path);
  if (candidate === undefined) {
    throw new Error(`Fixture no longer offers ${path} as an enrichment candidate.`);
  }
  return candidate.estTokens;
}

async function hybridScan(findingsFor: (input: LlmEnricherInput) => TokenRiskFinding[]) {
  return scanRepo({
    root: semanticDuplicatesAppRoot,
    mode: "hybrid",
    enricher: scriptedEnricher(findingsFor),
    now: new Date("2026-08-24T18:00:00.000Z"),
  });
}

describe("scanRepo (hybrid, non-empty LLM findings)", () => {
  it("routes an LLM finding into the llm and combined layers", async () => {
    const { report } = await hybridScan((input) => [
      {
        path: DUPLICATE_A,
        reason: "semantic_bloat",
        bytes: 395,
        estTokens: candidateTokens(input, DUPLICATE_A),
        action: "excluded",
        source: "llm",
        confidence: 0.8,
        detail: "Scripted finding.",
      },
    ]);

    expect(isTokenRiskReport(report)).toBe(true);
    expect(report.scan).toMatchObject({
      mode: "hybrid",
      llm: { backend: "noop", durationMs: 12 },
    });
    expect(report.scan?.llm?.candidatesSent).toBeGreaterThan(0);

    expect(report.layers?.llm.findings.map((finding) => finding.path)).toEqual([
      DUPLICATE_A,
    ]);
    expect(report.layers?.combined.findings.some((f) => f.path === DUPLICATE_A)).toBe(
      true,
    );
    // The heuristic layer stays empty for this fixture — the LLM finding must
    // not leak backwards into it.
    expect(report.layers?.heuristic.findings).toEqual([]);
  });

  it("counts an excluded LLM finding as savings in both layers", async () => {
    const { report } = await hybridScan((input) => [
      {
        path: DUPLICATE_A,
        reason: "semantic_bloat",
        bytes: 395,
        estTokens: candidateTokens(input, DUPLICATE_A),
        action: "excluded",
        source: "llm",
      },
    ]);

    const saved = report.layers!.llm.totals.savedTokens;
    expect(saved).toBeGreaterThan(0);
    expect(report.layers!.llm.totals.afterTokens).toBe(
      report.layers!.llm.totals.beforeTokens - saved,
    );
    // Combined totals span the whole tree, so excluding one path shrinks
    // afterTokens by exactly that path's estimate.
    expect(report.layers!.combined.totals.savedTokens).toBe(saved);
  });

  it("claims no savings for a kept duplicate_logic finding (HEURISTICS_AUDIT B7/B9)", async () => {
    const { report } = await hybridScan((input) => [
      {
        path: DUPLICATE_A,
        reason: "duplicate_logic",
        bytes: 395,
        estTokens: candidateTokens(input, DUPLICATE_A),
        action: "kept",
        source: "llm",
        confidence: 0.8,
        detail: `Same behavior as ${DUPLICATE_B}.`,
      },
    ]);

    // duplicate_logic is always verdict review -> action kept. Both copies are
    // still imported, so counting either as a saving would be phantom math.
    expect(report.layers?.llm.findings[0]).toMatchObject({
      reason: "duplicate_logic",
      action: "kept",
    });
    expect(report.layers?.llm.totals.savedTokens).toBe(0);

    // And it must not silently disappear from the tree-wide totals either.
    const combined = report.layers!.combined.totals;
    expect(combined.savedTokens).toBe(0);
    expect(combined.afterTokens).toBe(combined.beforeTokens);
  });

  it("counts only the excluded path when a batch mixes kept and excluded", async () => {
    // Regression guard for the totals filter: this fails if anyone ever folds
    // `kept` findings into the savings math.
    let excludedTokens = 0;
    const { report } = await hybridScan((input) => {
      excludedTokens = candidateTokens(input, OTHER_CANDIDATE);
      return [
        {
          path: DUPLICATE_A,
          reason: "duplicate_logic",
          bytes: 395,
          estTokens: candidateTokens(input, DUPLICATE_A),
          action: "kept",
          source: "llm",
        },
        {
          path: OTHER_CANDIDATE,
          reason: "semantic_bloat",
          bytes: 342,
          estTokens: candidateTokens(input, OTHER_CANDIDATE),
          action: "excluded",
          source: "llm",
        },
      ];
    });

    expect(report.layers?.llm.findings).toHaveLength(2);
    expect(report.layers?.llm.totals.savedTokens).toBe(excludedTokens);
    expect(report.layers?.combined.totals.savedTokens).toBe(excludedTokens);
  });
});

describe("complementarity acceptance (#209)", () => {
  it("noisy-app: heuristic savings dominate and hybrid records delta metadata", async () => {
    const heuristic = await scanRepo({
      root: fixtureRoot,
      now: new Date("2026-08-24T18:00:00.000Z"),
    });
    const hybrid = await scanRepo({
      root: fixtureRoot,
      mode: "hybrid",
      now: new Date("2026-08-24T18:00:00.000Z"),
      enricher: scriptedEnricher(
        () => [],
        {
          analysisOverview: {
            summary: "Scripted overview for complementarity acceptance.",
            themes: ["lockfiles"],
          },
        },
      ),
    });

    expect(heuristic.report.totals.savedTokens).toBeGreaterThan(0);
    expect(hybrid.report.totals.savedTokens).toBe(heuristic.report.totals.savedTokens);
    expect(hybrid.report.scan?.hybridDelta).toMatchObject({
      heuristicSavedTokens: heuristic.report.totals.savedTokens,
      combinedSavedTokens: heuristic.report.totals.savedTokens,
      complementarityStatus: "llm_empty",
    });
    expect(hybrid.report.scan?.llm?.analysisOverview?.summary).toContain(
      "complementarity",
    );
  });

  it("instructions-app: heuristic keeps instruction files; hybrid LLM adds exclusive savings", async () => {
    const { assessments } = await scanRepo({ root: instructionsAppRoot });
    const index = assessments.find((assessment) => assessment.path === "src/index.js");
    expect(index).toBeDefined();

    const { report } = await scanRepo({
      root: instructionsAppRoot,
      mode: "hybrid",
      enricher: scriptedEnricher(() => [
        {
          path: "src/index.js",
          reason: "semantic_bloat",
          bytes: index!.bytes,
          estTokens: index!.estTokens,
          action: "excluded",
          source: "llm",
        },
      ]),
    });

    expect(report.layers?.heuristic.totals.savedTokens).toBe(0);
    expect(report.totals.savedTokens).toBe(index!.estTokens);
    expect(
      report.findings.some(
        (finding) =>
          finding.source === "heuristic" &&
          finding.reason === "semantic_bloat" &&
          finding.action === "kept",
      ),
    ).toBe(true);
    expect(report.scan?.hybridDelta).toMatchObject({
      complementarityStatus: "ok",
      llmFindingCount: 1,
      llmExclusiveSavedTokens: index!.estTokens,
    });
  });

  it("heuristic-edge-app: unsafe LLM excludes on protected source are gated", async () => {
    const { report } = await scanRepo({
      root: heuristicEdgeAppRoot,
      mode: "hybrid",
      enricher: structuredEnricher(() => [
        {
          path: "src/index.ts",
          verdict: "exclude",
          reason: "semantic_bloat",
          confidence: 0.95,
          detail: "Unsafe source exclude attempt.",
        },
      ]),
    });

    const indexed = report.layers?.llm.findings.find(
      (finding) => finding.path === "src/index.ts",
    );
    expect(indexed?.action).toBe("kept");
    expect(
      report.findings.find((finding) => finding.path === "src/index.ts")?.action,
    ).not.toBe("excluded");
  });

  it("semantic-duplicates-app: surfaces duplicate_logic as kept LLM advisory", async () => {
    const { report } = await hybridScan((input) => [
      {
        path: DUPLICATE_A,
        reason: "duplicate_logic",
        bytes: 395,
        estTokens: candidateTokens(input, DUPLICATE_A),
        action: "kept",
        source: "llm",
        confidence: 0.84,
        detail: `Same behavior as ${DUPLICATE_B}.`,
      },
    ]);

    expect(report.scan?.hybridDelta).toMatchObject({
      complementarityStatus: "ok",
      llmFindingCount: 1,
    });
    expect(report.layers?.llm.findings[0]).toMatchObject({
      reason: "duplicate_logic",
      action: "kept",
    });
  });
});
