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

/** Confidence bump when the map corroborates a cross-file claim. */
function strengthen(finding: LlmStructuredFinding): LlmStructuredFinding {
  const base = finding.confidence ?? 0.7;
  return {
    ...finding,
    confidence: Math.min(0.95, Math.round((base + 0.05) * 100) / 100),
  };
}

/**
 * Deterministic safety net after Pass B / Pass C.
 * - Dedupes by path (keeps higher confidence)
 * - Downgrades `redundant_instructions` when the map has no related sibling
 * - Weakens (never relabels) an uncorroborated `duplicate_logic` claim
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
    if (
      finding.reason !== "redundant_instructions" &&
      finding.reason !== "duplicate_logic"
    ) {
      return finding;
    }

    const related = relatedPathsInMap(map, finding.path);
    if (related.size > 0) {
      return strengthen(finding);
    }

    // Unlike instructions, an uncorroborated duplicate_logic claim is NOT
    // relabelled: semantic_bloat asserts something different (low unique
    // signal) about application code, and it is the label that invites
    // exclusion. Pass B also sees fuller excerpts than Pass A's digests, so
    // it can legitimately spot a pair the map missed — weaken the claim,
    // don't rewrite or delete it.
    if (finding.reason === "duplicate_logic") {
      const base = finding.confidence ?? 0.7;
      return {
        ...finding,
        confidence: Math.max(0, Math.round((base - 0.15) * 100) / 100),
        detail:
          finding.detail ??
          "Duplicate-logic claim was not corroborated by the context map; treated as lower confidence.",
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
