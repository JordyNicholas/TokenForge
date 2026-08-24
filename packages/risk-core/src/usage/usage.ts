/**
 * Provider-agnostic billed usage for Prove (JSON contract).
 * Demo/import/sync are data sources — not vendor billing SDKs in the kernel.
 */

export type UsageSource = "demo" | "import" | "sync";

export type UsageTeamRow = {
  team: string;
  creditsUsed: number;
  estimatedUsd: number;
};

export type UsageMetrics = {
  source: UsageSource;
  /** Vendor label for display (copilot, cursor, …) — not an API binding. */
  providerLabel: string;
  period: string;
  teams: UsageTeamRow[];
  totals: {
    creditsUsed: number;
    estimatedUsd: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUsageTeamRow(value: unknown): value is UsageTeamRow {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.team === "string" &&
    value.team.length > 0 &&
    typeof value.creditsUsed === "number" &&
    Number.isFinite(value.creditsUsed) &&
    typeof value.estimatedUsd === "number" &&
    Number.isFinite(value.estimatedUsd)
  );
}

export function isUsageMetrics(value: unknown): value is UsageMetrics {
  if (!isRecord(value)) {
    return false;
  }
  if (value.source !== "demo" && value.source !== "import" && value.source !== "sync") {
    return false;
  }
  if (typeof value.providerLabel !== "string" || !value.providerLabel) {
    return false;
  }
  if (typeof value.period !== "string" || !value.period) {
    return false;
  }
  if (!Array.isArray(value.teams) || !value.teams.every(isUsageTeamRow)) {
    return false;
  }
  if (!isRecord(value.totals)) {
    return false;
  }
  return (
    typeof value.totals.creditsUsed === "number" &&
    Number.isFinite(value.totals.creditsUsed) &&
    typeof value.totals.estimatedUsd === "number" &&
    Number.isFinite(value.totals.estimatedUsd)
  );
}

export function usageForTeam(
  usage: UsageMetrics | null | undefined,
  teamId: string | null,
): { creditsUsed: number; estimatedUsd: number } | null {
  if (!usage) {
    return null;
  }
  if (!teamId) {
    return usage.totals;
  }
  const row = usage.teams.find((entry) => entry.team === teamId);
  return row
    ? { creditsUsed: row.creditsUsed, estimatedUsd: row.estimatedUsd }
    : null;
}

/** Rebuild totals from team rows (after teamScope filter). */
export function totalsFromUsageTeams(teams: UsageTeamRow[]): UsageMetrics["totals"] {
  return teams.reduce(
    (acc, row) => ({
      creditsUsed: acc.creditsUsed + row.creditsUsed,
      estimatedUsd: acc.estimatedUsd + row.estimatedUsd,
    }),
    { creditsUsed: 0, estimatedUsd: 0 },
  );
}
