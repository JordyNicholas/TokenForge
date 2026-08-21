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

function countRawPathMentions(payload: Record<string, unknown>): number {
  let count = 0;
  if (Array.isArray(payload.hubs)) {
    count += payload.hubs.filter((item) => typeof item === "string").length;
  }
  if (Array.isArray(payload.suspects)) {
    count += payload.suspects.filter((item) => typeof item === "string").length;
  }
  for (const key of ["clusters", "batchHints"] as const) {
    const groups = payload[key];
    if (!Array.isArray(groups)) {
      continue;
    }
    for (const group of groups) {
      if (!Array.isArray(group)) {
        continue;
      }
      count += group.filter((item) => typeof item === "string").length;
    }
  }
  return count;
}

/** Why Pass A JSON was rejected after parse. */
export type RepoContextMapRejectReason =
  | "not_object"
  | "no_candidates"
  | "no_known_paths"
  | "empty_signal";

export type RepoContextMapEvaluation =
  | { ok: true; map: RepoContextMap }
  | {
      ok: false;
      reason: RepoContextMapRejectReason;
      detail: string;
    };

/**
 * Validate Pass A JSON into a {@link RepoContextMap} with a reject reason.
 */
export function evaluateRepoContextMap(
  payload: unknown,
  candidates: readonly EnrichmentCandidate[],
): RepoContextMapEvaluation {
  if (!isRecord(payload)) {
    return {
      ok: false,
      reason: "not_object",
      detail: "Pass A payload was not a JSON object.",
    };
  }

  const allowed = new Set(candidates.map((candidate) => candidate.path));
  if (allowed.size === 0) {
    return {
      ok: false,
      reason: "no_candidates",
      detail: "No enrichment candidates were available to validate paths against.",
    };
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
    const rawMentions = countRawPathMentions(payload);
    if (rawMentions > 0) {
      return {
        ok: false,
        reason: "no_known_paths",
        detail:
          `Pass A mentioned ${rawMentions} path(s), but none matched the candidate inventory ` +
          "(invented or mistyped paths).",
      };
    }
    return {
      ok: false,
      reason: "empty_signal",
      detail:
        "Pass A JSON had no usable hubs, clusters, batchHints, or suspects.",
    };
  }

  const map: RepoContextMap = {
    hubs,
    clusters,
    batchHints,
  };
  if (suspects.length > 0) {
    map.suspects = suspects;
  }
  return { ok: true, map };
}

/**
 * Parse Pass A JSON into a {@link RepoContextMap}.
 * Returns `null` when the payload is unusable (caller falls back to flat batching).
 */
export function parseRepoContextMap(
  payload: unknown,
  candidates: readonly EnrichmentCandidate[],
): RepoContextMap | null {
  const result = evaluateRepoContextMap(payload, candidates);
  return result.ok ? result.map : null;
}
