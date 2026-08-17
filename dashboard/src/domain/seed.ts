import {
  isTokenRiskReport,
  type TokenRiskReport,
  type TokenRiskTotals,
} from "@tokenforge/risk-core";

export const DEMO_SEED_URL = "/demo-seed.json";

export type DashboardSeed = {
  businessUnit: string;
  reports: TokenRiskReport[];
};

export class SeedLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedLoadError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDashboardSeed(value: unknown): value is DashboardSeed {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.businessUnit === "string" &&
    value.businessUnit.length > 0 &&
    Array.isArray(value.reports) &&
    value.reports.length > 0 &&
    value.reports.every(isTokenRiskReport)
  );
}

/** Accept a BU seed or a single Token Risk report (CLI / extension JSON). */
export function parseDashboardDocument(value: unknown): DashboardSeed {
  if (isDashboardSeed(value)) {
    return value;
  }
  if (isTokenRiskReport(value)) {
    return { businessUnit: value.team, reports: [value] };
  }
  throw new SeedLoadError(
    "JSON is not a Token Risk report or a dashboard seed (businessUnit + reports).",
  );
}

export function aggregateTotals(reports: TokenRiskReport[]): TokenRiskTotals {
  return reports.reduce<TokenRiskTotals>(
    (acc, report) => ({
      beforeTokens: acc.beforeTokens + report.totals.beforeTokens,
      afterTokens: acc.afterTokens + report.totals.afterTokens,
      savedTokens: acc.savedTokens + report.totals.savedTokens,
    }),
    { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
