import type { EnrichmentCandidate } from "../types";
import type { RepoContextMap } from "./types";

/** Flat chunking used when no map is available (legacy behaviour). */
export function chunkCandidates(
  candidates: readonly EnrichmentCandidate[],
  size: number,
): EnrichmentCandidate[][] {
  const batches: EnrichmentCandidate[][] = [];
  const safeSize = Math.max(1, size);
  for (let index = 0; index < candidates.length; index += safeSize) {
    batches.push(candidates.slice(index, index + safeSize));
  }
  return batches;
}

function byPath(
  candidates: readonly EnrichmentCandidate[],
): Map<string, EnrichmentCandidate> {
  return new Map(candidates.map((candidate) => [candidate.path, candidate]));
}

/**
 * Group candidates for Pass B.
 * Prefer map clusters / batchHints together, then fill remaining slots;
 * leftovers use flat chunking in original order.
 */
export function groupCandidatesForJudge(
  candidates: readonly EnrichmentCandidate[],
  map: RepoContextMap | null | undefined,
  batchSize: number,
): EnrichmentCandidate[][] {
  const safeSize = Math.max(1, batchSize);
  if (!map || candidates.length === 0) {
    return chunkCandidates(candidates, safeSize);
  }

  const lookup = byPath(candidates);
  const remaining = new Set(candidates.map((candidate) => candidate.path));
  const batches: EnrichmentCandidate[][] = [];

  const preferredGroups = [...map.batchHints, ...map.clusters];
  for (const group of preferredGroups) {
    const members = group
      .filter((path) => remaining.has(path))
      .map((path) => lookup.get(path)!)
      .filter(Boolean);
    if (members.length < 2) {
      continue;
    }

    for (let index = 0; index < members.length; index += safeSize) {
      const slice = members.slice(index, index + safeSize);
      for (const member of slice) {
        remaining.delete(member.path);
      }
      batches.push(slice);
    }
  }

  const leftovers = candidates.filter((candidate) => remaining.has(candidate.path));
  batches.push(...chunkCandidates(leftovers, safeSize));
  return batches;
}
