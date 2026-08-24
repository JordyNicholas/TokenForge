import { readFile } from "node:fs/promises";
import {
  isUsageMetrics,
  totalsFromUsageTeams,
  type UsageMetrics,
} from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../app/errors";
import type { FetchUsageQuery, UsageProvider } from "./types";

export type FixtureUsageProviderOptions = {
  /** Path to a UsageMetrics JSON document (file adapter). */
  filePath?: string;
  /** In-memory metrics for tests / embedded fixtures. */
  metrics?: UsageMetrics;
  /**
   * When set, `fetchUsage` rejects queries whose `org` differs.
   * Fixture has no live auth — this only guards demo wiring.
   */
  org?: string;
};

function filterByTeamScope(metrics: UsageMetrics, teamScope: string): UsageMetrics {
  const teams = metrics.teams.filter((row) => row.team === teamScope);
  if (teams.length === 0) {
    throw new UsageError(
      `Fixture usage has no team "${teamScope}" for period ${metrics.period}.`,
    );
  }
  return {
    ...metrics,
    teams,
    totals: totalsFromUsageTeams(teams),
  };
}

async function loadMetrics(options: FixtureUsageProviderOptions): Promise<UsageMetrics> {
  if (options.metrics) {
    if (!isUsageMetrics(options.metrics)) {
      throw new RuntimeError("Fixture UsageProvider metrics are not valid UsageMetrics.");
    }
    return options.metrics;
  }
  if (!options.filePath) {
    throw new UsageError(
      "Fixture UsageProvider requires filePath or metrics (UsageMetrics JSON).",
    );
  }
  let raw: string;
  try {
    raw = await readFile(options.filePath, "utf8");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new RuntimeError(`Cannot read usage fixture ${options.filePath}: ${detail}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new RuntimeError(`Usage fixture is not valid JSON: ${options.filePath}`);
  }
  if (!isUsageMetrics(parsed)) {
    throw new RuntimeError(
      `Usage fixture does not match UsageMetrics: ${options.filePath}`,
    );
  }
  return parsed;
}

/**
 * File / in-memory UsageProvider. No vendor SDK — Wave B port boundary for #90+.
 */
export function createFixtureUsageProvider(
  options: FixtureUsageProviderOptions,
): UsageProvider {
  if (!options.filePath && !options.metrics) {
    throw new UsageError(
      "createFixtureUsageProvider requires filePath or metrics.",
    );
  }

  return {
    id: "fixture",
    async fetchUsage(query: FetchUsageQuery): Promise<UsageMetrics> {
      if (!query.period || !query.period.trim()) {
        throw new UsageError("fetchUsage requires a non-empty period.");
      }
      if (
        options.org !== undefined &&
        query.org !== undefined &&
        query.org !== options.org
      ) {
        throw new UsageError(
          `Fixture org mismatch: configured "${options.org}", query "${query.org}".`,
        );
      }

      const metrics = await loadMetrics(options);
      if (metrics.period !== query.period) {
        throw new UsageError(
          `Fixture period is ${metrics.period}, query asked for ${query.period}.`,
        );
      }

      const scope = query.teamScope?.trim();
      if (scope) {
        return filterByTeamScope(metrics, scope);
      }
      return metrics;
    },
  };
}
