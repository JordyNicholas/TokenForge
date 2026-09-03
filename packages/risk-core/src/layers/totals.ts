import type {
  ComplementarityStatus,
  HybridDelta,
  RiskAssessment,
  ScanLayers,
  TokenRiskFinding,
  TokenRiskTotals,
} from "../domain/types";
import { mergeFindings } from "../merge/merge";
import { ASSET_DIR_GLOB_SUFFIX, isAssetDirectoryGlob } from "../policy/density";

export type BuildScanLayersResult = ScanLayers & { hybridDelta?: HybridDelta };

export function tallyHeuristicTotals(
  assessments: readonly RiskAssessment[],
): TokenRiskTotals {
  let beforeTokens = 0;
  let afterTokens = 0;
  for (const assessment of assessments) {
    beforeTokens += assessment.estTokens;
    if (!assessment.atRisk) {
      afterTokens += assessment.estTokens;
    }
  }
  return {
    beforeTokens,
    afterTokens,
    savedTokens: beforeTokens - afterTokens,
  };
}

export function tallyLlmTotals(
  candidateTokens: number,
  findings: readonly TokenRiskFinding[],
): TokenRiskTotals {
  const savedTokens = findings
    .filter((finding) => finding.action === "excluded" || finding.action === "filtered")
    .reduce((sum, finding) => sum + finding.estTokens, 0);
  const beforeTokens = candidateTokens > 0 ? candidateTokens : savedTokens;
  return {
    beforeTokens,
    afterTokens: beforeTokens - savedTokens,
    savedTokens,
  };
}

export function tallyCombinedTotals(
  assessments: readonly RiskAssessment[],
  findings: readonly TokenRiskFinding[],
): TokenRiskTotals {
  const excludedPaths = new Set<string>();
  // A folded asset directory speaks for a subtree, so it matches no assessment
  // by name. Counting it by equality alone would bank the finding while still
  // charging every file it covers to `afterTokens`.
  const excludedPrefixes: string[] = [];

  for (const finding of findings) {
    if (finding.action !== "excluded" && finding.action !== "filtered") {
      continue;
    }
    if (isAssetDirectoryGlob(finding.path)) {
      excludedPrefixes.push(
        finding.path.slice(0, -ASSET_DIR_GLOB_SUFFIX.length + 1),
      );
      continue;
    }
    excludedPaths.add(finding.path);
  }

  const isExcluded = (path: string): boolean =>
    excludedPaths.has(path) ||
    excludedPrefixes.some((prefix) => path.startsWith(prefix));

  let beforeTokens = 0;
  let afterTokens = 0;
  for (const assessment of assessments) {
    beforeTokens += assessment.estTokens;
    if (!isExcluded(assessment.path)) {
      afterTokens += assessment.estTokens;
    }
  }
  return {
    beforeTokens,
    afterTokens,
    savedTokens: beforeTokens - afterTokens,
  };
}

export function computeHybridDelta(input: {
  assessments: readonly RiskAssessment[];
  heuristicFindings: readonly TokenRiskFinding[];
  llmFindings: readonly TokenRiskFinding[];
  combinedFindings: readonly TokenRiskFinding[];
  candidatesSent: number;
}): HybridDelta {
  const heuristicSavedTokens = tallyCombinedTotals(
    input.assessments,
    input.heuristicFindings,
  ).savedTokens;
  const combinedSavedTokens = tallyCombinedTotals(
    input.assessments,
    input.combinedFindings,
  ).savedTokens;
  const llmExclusiveSavedTokens = Math.max(
    0,
    combinedSavedTokens - heuristicSavedTokens,
  );
  const llmFindingCount = input.llmFindings.length;

  let complementarityStatus: ComplementarityStatus;
  if (input.candidatesSent === 0) {
    complementarityStatus = "candidates_skipped";
  } else if (llmFindingCount === 0) {
    complementarityStatus = "llm_empty";
  } else {
    complementarityStatus = "ok";
  }

  return {
    heuristicSavedTokens,
    llmExclusiveSavedTokens,
    combinedSavedTokens,
    llmFindingCount,
    complementarityStatus,
  };
}

export function buildScanLayers(input: {
  assessments: readonly RiskAssessment[];
  heuristicFindings: readonly TokenRiskFinding[];
  llmFindings: readonly TokenRiskFinding[];
  llmCandidateTokens?: number;
  /** When set, hybrid complementarity metrics are computed (#205). */
  candidatesSent?: number;
}): BuildScanLayersResult {
  const heuristicTotals = tallyHeuristicTotals(input.assessments);
  const combinedFindings = mergeFindings(input.heuristicFindings, input.llmFindings);
  const combinedTotals = tallyCombinedTotals(input.assessments, combinedFindings);
  const llmTotals = tallyLlmTotals(
    input.llmCandidateTokens ?? 0,
    input.llmFindings,
  );

  const layers: ScanLayers = {
    heuristic: {
      findings: [...input.heuristicFindings],
      totals: heuristicTotals,
    },
    llm: {
      findings: [...input.llmFindings],
      totals: llmTotals,
    },
    combined: {
      findings: combinedFindings,
      totals: combinedTotals,
    },
  };

  if (input.candidatesSent === undefined) {
    return layers;
  }

  return {
    ...layers,
    hybridDelta: computeHybridDelta({
      assessments: input.assessments,
      heuristicFindings: input.heuristicFindings,
      llmFindings: input.llmFindings,
      combinedFindings,
      candidatesSent: input.candidatesSent,
    }),
  };
}
