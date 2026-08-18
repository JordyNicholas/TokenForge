import type { FindingSource, TokenRiskFinding } from "../domain/types";

function sortFindings(a: TokenRiskFinding, b: TokenRiskFinding): number {
  return b.estTokens - a.estTokens || a.path.localeCompare(b.path);
}

function withSource(
  finding: TokenRiskFinding,
  source: FindingSource,
): TokenRiskFinding {
  return finding.source === source ? finding : { ...finding, source };
}

/**
 * Merge heuristic baseline findings with optional LLM enricher findings.
 * Heuristic token fields and `reason` win on path collisions.
 */
export function mergeFindings(
  heuristic: readonly TokenRiskFinding[],
  llm: readonly TokenRiskFinding[],
): TokenRiskFinding[] {
  const byPath = new Map<string, TokenRiskFinding>();

  for (const finding of heuristic) {
    byPath.set(finding.path, withSource(finding, finding.source ?? "heuristic"));
  }

  for (const finding of llm) {
    const existing = byPath.get(finding.path);
    if (existing === undefined) {
      byPath.set(finding.path, withSource(finding, "llm"));
      continue;
    }

    byPath.set(finding.path, {
      ...existing,
      source: "combined",
      confidence: finding.confidence ?? existing.confidence,
      detail: finding.detail ?? existing.detail,
      suggestion: finding.suggestion ?? existing.suggestion,
    });
  }

  return [...byPath.values()].sort(sortFindings);
}
