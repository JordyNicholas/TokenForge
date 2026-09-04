import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isUsageMetrics, type UsageMetrics } from "@tokenforge/risk-core";
import { UsageError } from "../../app/errors";

export type RemapUsageOptions = {
  mapPath: string;
  inPath: string;
  outPath: string;
};

export type RemapUsageResult = {
  inPath: string;
  outPath: string;
  mapPath: string;
  teamCount: number;
  remappedCount: number;
  metrics: UsageMetrics;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUsageTeamMap(text: string, mapPath: string): Record<string, string> {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new UsageError(`Usage team map is not valid JSON: ${mapPath}`);
  }
  if (
    !isRecord(payload) ||
    payload.schemaVersion !== 1 ||
    !isRecord(payload.map) ||
    !Object.entries(payload.map).every(
      ([from, to]) =>
        typeof from === "string" && from.length > 0 && typeof to === "string" && to.length > 0,
    )
  ) {
    throw new UsageError(
      `Usage team map must be { schemaVersion: 1, map: { … } }: ${mapPath}`,
    );
  }
  return payload.map as Record<string, string>;
}

function parseUsageDocument(text: string, inPath: string): UsageMetrics {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new UsageError(`Usage input is not valid JSON: ${inPath}`);
  }
  if (isUsageMetrics(payload)) {
    return payload;
  }
  if (isRecord(payload) && isUsageMetrics(payload.usage)) {
    return payload.usage;
  }
  throw new UsageError(`Input does not match UsageMetrics: ${inPath}`);
}

function mergeTeamRows(
  rows: UsageMetrics["teams"],
): UsageMetrics["teams"] {
  const byTeam = new Map<string, UsageMetrics["teams"][number]>();
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

function remapUsageTeams(
  usage: UsageMetrics,
  map: Record<string, string>,
): UsageMetrics {
  if (Object.keys(map).length === 0) {
    return usage;
  }
  const teams = mergeTeamRows(
    usage.teams.map((row) => ({
      ...row,
      team: map[row.team] ?? row.team,
    })),
  );
  const totals = teams.reduce(
    (acc, row) => ({
      creditsUsed: acc.creditsUsed + row.creditsUsed,
      estimatedUsd: acc.estimatedUsd + row.estimatedUsd,
    }),
    { creditsUsed: 0, estimatedUsd: 0 },
  );
  return {
    ...usage,
    teams,
    totals,
  };
}

/** Remap vendor team labels in a UsageMetrics JSON file. */
export async function remapUsage(options: RemapUsageOptions): Promise<RemapUsageResult> {
  const mapPath = resolve(options.mapPath);
  const inPath = resolve(options.inPath);
  const outPath = resolve(options.outPath);
  const map = parseUsageTeamMap(await readFile(mapPath, "utf8"), mapPath);
  const usage = parseUsageDocument(await readFile(inPath, "utf8"), inPath);
  const beforeTeams = new Set(usage.teams.map((row) => row.team));
  const metrics = remapUsageTeams(usage, map);
  const remappedCount = usage.teams.filter((row) => map[row.team] && map[row.team] !== row.team).length;
  await writeFile(outPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  return {
    inPath,
    outPath,
    mapPath,
    teamCount: beforeTeams.size,
    remappedCount,
    metrics,
  };
}
