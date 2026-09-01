import type {
  InstructionBudget,
  LlmBackendId,
  RiskAssessment,
  TokenRiskFinding,
} from "../domain/types";
import { DEFAULT_MAX_ENRICHMENT_CANDIDATES } from "../domain/constants";
import { isInstructionPath, orderedBucketAssessments, type EnrichmentCandidateOptions } from "./candidates";

export type EnrichmentTier = "local" | "vendor";

export type HeuristicAttentionInput = {
  assessments: readonly RiskAssessment[];
  findings?: readonly TokenRiskFinding[];
  instructionBudget?: InstructionBudget;
};

export type HeuristicAttentionOptions = EnrichmentCandidateOptions & {
  tier?: EnrichmentTier;
};

const LOCAL_BACKENDS = new Set<LlmBackendId>(["noop", "ollama"]);

export function enrichmentTierForBackend(backend: LlmBackendId): EnrichmentTier {
  return LOCAL_BACKENDS.has(backend) ? "local" : "vendor";
}

function findingPaths(findings: readonly TokenRiskFinding[] | undefined): Set<string> {
  const paths = new Set<string>();
  if (!findings) {
    return paths;
  }
  for (const finding of findings) {
    paths.add(finding.path);
  }
  return paths;
}

function budgetPaths(budget: InstructionBudget | undefined): Set<string> {
  const paths = new Set<string>();
  if (!budget) {
    return paths;
  }
  for (const file of budget.files) {
    paths.add(file.path);
  }
  return paths;
}

/**
 * Heuristic priority for local-tier caps. Higher = send to LLM first.
 */
export function attentionPriorityScore(input: {
  assessment: RiskAssessment;
  findingPaths: ReadonlySet<string>;
  budgetPaths: ReadonlySet<string>;
}): number {
  const { assessment, findingPaths: findings, budgetPaths: budget } = input;
  let score = 0;
  if (isInstructionPath(assessment.path)) {
    score += 100;
  }
  if (budget.has(assessment.path)) {
    score += 80;
  }
  if (findings.has(assessment.path)) {
    score += 50;
  }
  if (assessment.atRisk) {
    score += 40;
  }
  score += Math.min(20, Math.floor(assessment.estTokens / 500));
  return score;
}

/** Full ranked attention list before tier cap. */
export function orderedAttentionAssessments(
  input: HeuristicAttentionInput,
  options: EnrichmentCandidateOptions = {},
): RiskAssessment[] {
  const baseOrdered = orderedBucketAssessments(input.assessments, options);
  const findingPathSet = findingPaths(input.findings);
  const budgetPathSet = budgetPaths(input.instructionBudget);
  const byPath = new Map<string, RiskAssessment>();
  for (const assessment of input.assessments) {
    byPath.set(assessment.path, assessment);
  }

  const seen = new Set<string>();
  const merged: RiskAssessment[] = [];

  const push = (path: string): void => {
    if (seen.has(path)) {
      return;
    }
    const assessment = byPath.get(path);
    if (!assessment) {
      return;
    }
    seen.add(path);
    merged.push(assessment);
  };

  for (const assessment of baseOrdered) {
    push(assessment.path);
  }
  for (const path of findingPathSet) {
    push(path);
  }
  for (const path of budgetPathSet) {
    push(path);
  }

  return merged.sort(
    (a, b) =>
      attentionPriorityScore({
        assessment: b,
        findingPaths: findingPathSet,
        budgetPaths: budgetPathSet,
      }) -
        attentionPriorityScore({
          assessment: a,
          findingPaths: findingPathSet,
          budgetPaths: budgetPathSet,
        }) ||
      b.estTokens - a.estTokens ||
      a.path.localeCompare(b.path),
  );
}

/**
 * Union of heuristic signals that deserve semantic review.
 * Vendor tier returns the full ranked set; local tier applies `maxCandidates`.
 */
export function buildHeuristicAttentionSet(
  input: HeuristicAttentionInput,
  options: HeuristicAttentionOptions = {},
): RiskAssessment[] {
  const tier = options.tier ?? "local";
  const localMax =
    options.maxCandidates ?? DEFAULT_MAX_ENRICHMENT_CANDIDATES;
  const ordered = orderedAttentionAssessments(input, options);
  if (tier === "vendor") {
    return ordered;
  }
  return ordered.slice(0, localMax);
}
