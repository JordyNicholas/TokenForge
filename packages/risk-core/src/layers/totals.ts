import type { RiskAssessment, TokenRiskFinding, TokenRiskTotals } from "../domain/types";
import { mergeFindings } from "../merge/merge";

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
  const excludedPaths = new Set(
    findings
      .filter((finding) => finding.action === "excluded" || finding.action === "filtered")
      .map((finding) => finding.path),
  );

  let beforeTokens = 0;
  let afterTokens = 0;
  for (const assessment of assessments) {
    beforeTokens += assessment.estTokens;
    if (!excludedPaths.has(assessment.path)) {
      afterTokens += assessment.estTokens;
    }
  }
  return {
    beforeTokens,
    afterTokens,
    savedTokens: beforeTokens - afterTokens,
  };
}

export function buildScanLayers(input: {
  assessments: readonly RiskAssessment[];
  heuristicFindings: readonly TokenRiskFinding[];
  llmFindings: readonly TokenRiskFinding[];
  llmCandidateTokens?: number;
}): {
  heuristic: { findings: TokenRiskFinding[]; totals: TokenRiskTotals };
  llm: { findings: TokenRiskFinding[]; totals: TokenRiskTotals };
  combined: { findings: TokenRiskFinding[]; totals: TokenRiskTotals };
} {
  const heuristicTotals = tallyHeuristicTotals(input.assessments);
  const combinedFindings = mergeFindings(input.heuristicFindings, input.llmFindings);
  const combinedTotals = tallyCombinedTotals(input.assessments, combinedFindings);
  const llmTotals = tallyLlmTotals(
    input.llmCandidateTokens ?? 0,
    input.llmFindings,
  );

  return {
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
}
