/**
 * Vendor FinOps team labels → TokenForge team ids for Prove reconcile (#F25-E).
 */
import { totalsFromUsageTeams, type UsageMetrics, type UsageTeamRow } from "./usage";

export type UsageTeamMapDocument = {
  schemaVersion: 1;
  map: Record<string, string>;
};

export class UsageTeamMapLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageTeamMapLoadError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUsageTeamMapDocument(value: unknown): value is UsageTeamMapDocument {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return false;
  }
  if (!isRecord(value.map)) {
    return false;
  }
  return Object.entries(value.map).every(
    ([from, to]) => typeof from === "string" && from.length > 0 && typeof to === "string" && to.length > 0,
  );
}

/** Parse `{ schemaVersion: 1, map: Record<string,string> }`. */
export function parseUsageTeamMapJson(text: string): Record<string, string> {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new UsageTeamMapLoadError("Usage team map is not valid JSON.");
  }
  if (!isUsageTeamMapDocument(payload)) {
    throw new UsageTeamMapLoadError(
      "Usage team map must be { schemaVersion: 1, map: { \"vendor-label\": \"tf-team-id\", … } }.",
    );
  }
  return payload.map;
}

export async function parseUsageTeamMapFile(file: File): Promise<Record<string, string>> {
  return parseUsageTeamMapJson(await file.text());
}

function mergeTeamRows(rows: UsageTeamRow[]): UsageTeamRow[] {
  const byTeam = new Map<string, UsageTeamRow>();
  for (const row of rows) {
    const existing = byTeam.get(row.team);
    if (existing) {
      byTeam.set(row.team, {
        team: row.team,
        creditsUsed: existing.creditsUsed + row.creditsUsed,
        estimatedUsd: existing.estimatedUsd + row.estimatedUsd,
      });
    } else {
      byTeam.set(row.team, { ...row });
    }
  }
  return [...byTeam.values()];
}

/** Rename `teams[].team` via map (vendor label → TF team id); rebuild totals. */
export function remapUsageTeams(
  usage: UsageMetrics,
  map: Record<string, string>,
): UsageMetrics {
  if (Object.keys(map).length === 0) {
    return usage;
  }
  const remapped = usage.teams.map((row) => ({
    ...row,
    team: map[row.team] ?? row.team,
  }));
  const teams = mergeTeamRows(remapped);
  return {
    ...usage,
    teams,
    totals: totalsFromUsageTeams(teams),
  };
}
