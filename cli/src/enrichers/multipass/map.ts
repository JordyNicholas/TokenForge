import type { EnrichmentCandidate } from "../types";
import type { RepoContextMap } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function filterKnownPaths(
  value: unknown,
  allowed: ReadonlySet<string>,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    paths.push(item);
  }
  return paths;
}

function filterPathGroups(
  value: unknown,
  allowed: ReadonlySet<string>,
): string[][] {
  if (!Array.isArray(value)) {
    return [];
  }
  const groups: string[][] = [];
  for (const item of value) {
    const group = filterKnownPaths(item, allowed);
    if (group.length >= 2) {
      groups.push(group);
    }
  }
  return groups;
}

/**
 * Parse Pass A JSON into a {@link RepoContextMap}.
 * Returns `null` when the payload is unusable (caller falls back to flat batching).
 */
export function parseRepoContextMap(
  payload: unknown,
  candidates: readonly EnrichmentCandidate[],
): RepoContextMap | null {
  if (!isRecord(payload)) {
    return null;
  }

  const allowed = new Set(candidates.map((candidate) => candidate.path));
  if (allowed.size === 0) {
    return null;
  }

  const hubs = filterKnownPaths(payload.hubs, allowed);
  const clusters = filterPathGroups(payload.clusters, allowed);
  const batchHints = filterPathGroups(payload.batchHints, allowed);
  const suspects = filterKnownPaths(payload.suspects, allowed);

  const hasSignal =
    hubs.length > 0 ||
    clusters.length > 0 ||
    batchHints.length > 0 ||
    suspects.length > 0;

  if (!hasSignal) {
    return null;
  }

  const map: RepoContextMap = {
    hubs,
    clusters,
    batchHints,
  };
  if (suspects.length > 0) {
    map.suspects = suspects;
  }
  return map;
}
