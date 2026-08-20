import type { LlmStructuredFinding } from "../types";
import type { RepoContextMap } from "./types";

/** Paths that share a cluster or batchHint with `path`. */
export function relatedPathsInMap(map: RepoContextMap, path: string): Set<string> {
  const related = new Set<string>();
  for (const group of [...map.clusters, ...map.batchHints]) {
    if (!group.includes(path)) {
      continue;
    }
    for (const member of group) {
      if (member !== path) {
        related.add(member);
      }
    }
  }
  return related;
}

function dedupeByPath(
  findings: readonly LlmStructuredFinding[],
): LlmStructuredFinding[] {
  const byPath = new Map<string, LlmStructuredFinding>();
  for (const finding of findings) {
    const existing = byPath.get(finding.path);
    if (!existing) {
      byPath.set(finding.path, finding);
      continue;
    }
    const existingConfidence = existing.confidence ?? 0;
    const nextConfidence = finding.confidence ?? 0;
    if (nextConfidence >= existingConfidence) {
      byPath.set(finding.path, finding);
    }
  }
  return [...byPath.values()];
}

/**
 * Deterministic safety net after Pass B / Pass C.
 * - Dedupes by path (keeps higher confidence)
 * - Downgrades `redundant_instructions` when the map has no related sibling
 * - Slightly strengthens confidence when redundancy is map-supported
 */
export function reconcileFindings(
  map: RepoContextMap | null | undefined,
  findings: readonly LlmStructuredFinding[],
): LlmStructuredFinding[] {
  const deduped = dedupeByPath(findings);
  if (!map) {
    return deduped;
  }

  return deduped.map((finding) => {
    if (finding.reason !== "redundant_instructions") {
      return finding;
    }

    const related = relatedPathsInMap(map, finding.path);
    if (related.size > 0) {
      const base = finding.confidence ?? 0.7;
      return {
        ...finding,
        confidence: Math.min(1, Math.round((base + 0.05) * 100) / 100),
      };
    }

    return {
      ...finding,
      reason: "semantic_bloat",
      detail:
        finding.detail ??
        "Redundancy claim was not supported by the context map; treated as semantic bloat.",
    };
  });
}
