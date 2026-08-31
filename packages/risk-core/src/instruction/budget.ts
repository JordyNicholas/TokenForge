import { isInstructionPath } from "../candidates/candidates";
import type { InstructionBudget, RiskAssessment, TokenRiskFinding } from "../domain/types";
import {
  hasInstructionRepetition,
  maxParagraphRepeatCount,
  RECOMMENDED_INSTRUCTION_STACK_TOKENS,
} from "./repetition";

export function computeInstructionBudget(
  assessments: readonly RiskAssessment[],
): InstructionBudget {
  const files = assessments
    .filter((assessment) => isInstructionPath(assessment.path))
    .map((assessment) => ({
      path: assessment.path,
      estTokens: assessment.estTokens,
    }))
    .sort((a, b) => b.estTokens - a.estTokens || a.path.localeCompare(b.path));

  const alwaysOnTokens = files.reduce((sum, file) => sum + file.estTokens, 0);
  return {
    alwaysOnTokens,
    recommendedMax: RECOMMENDED_INSTRUCTION_STACK_TOKENS,
    files,
  };
}

export function buildInstructionHeuristicFindings(input: {
  assessments: readonly RiskAssessment[];
  contentsByPath: ReadonlyMap<string, string>;
}): TokenRiskFinding[] {
  const findings: TokenRiskFinding[] = [];

  for (const assessment of input.assessments) {
    if (!isInstructionPath(assessment.path)) {
      continue;
    }
    const content = input.contentsByPath.get(assessment.path);
    if (content === undefined) {
      continue;
    }
    const repeats = maxParagraphRepeatCount(content);
    if (!hasInstructionRepetition(content)) {
      continue;
    }
    findings.push({
      path: assessment.path,
      reason: "semantic_bloat",
      bytes: assessment.bytes,
      estTokens: assessment.estTokens,
      action: "kept",
      source: "heuristic",
      detail: `Repeated paragraph block (${repeats}x). Trim duplicate sections — heuristic audit, not LLM.`,
    });
  }

  return findings.sort(
    (a, b) => b.estTokens - a.estTokens || a.path.localeCompare(b.path),
  );
}

export function isInstructionStackOverBudget(budget: InstructionBudget): boolean {
  return budget.alwaysOnTokens > budget.recommendedMax;
}
