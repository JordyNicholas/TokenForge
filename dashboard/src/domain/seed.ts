import {
  isTokenRiskReport,
  type TokenRiskReport,
  type TokenRiskTotals,
} from "@tokenforge/risk-core";
import {
  isArchitectureStyle,
  type ArchitectureStyle,
} from "./architecture";
import { isUsageMetrics, type UsageMetrics } from "./usage";

export const DEMO_SEED_URL = "/demo-seed.json";
export const DEMO_USAGE_URL = "/demo-usage.json";

export type DashboardSeed = {
  businessUnit: string;
  reports: TokenRiskReport[];
  /** Optional per-team architecture labels for Prove (seed metadata). */
  architectures?: Record<string, ArchitectureStyle>;
  /** Optional imported usage metrics (#27 thin) — not live billing. */
  usage?: UsageMetrics;
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

function parseArchitectures(
  value: unknown,
): Record<string, ArchitectureStyle> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new SeedLoadError("architectures must be an object of team → style.");
  }
  const out: Record<string, ArchitectureStyle> = {};
  for (const [team, style] of Object.entries(value)) {
    if (typeof style !== "string" || !isArchitectureStyle(style)) {
      throw new SeedLoadError(
        `Unknown architecture "${String(style)}" for team "${team}".`,
      );
    }
    out[team] = style;
  }
  return out;
}

export function isDashboardSeed(value: unknown): value is DashboardSeed {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.businessUnit !== "string" ||
    value.businessUnit.length === 0 ||
    !Array.isArray(value.reports) ||
    value.reports.length === 0 ||
    !value.reports.every(isTokenRiskReport)
  ) {
    return false;
  }
  if (value.usage !== undefined && !isUsageMetrics(value.usage)) {
    return false;
  }
  if (value.architectures !== undefined) {
    try {
      parseArchitectures(value.architectures);
    } catch {
      return false;
    }
  }
  return true;
}

/** Accept a BU seed or a single Token Risk report (CLI / extension JSON). */
export function parseDashboardDocument(value: unknown): DashboardSeed {
  if (isDashboardSeed(value)) {
    const architectures = parseArchitectures(
      (value as DashboardSeed).architectures,
    );
    return {
      businessUnit: value.businessUnit,
      reports: value.reports,
      ...(architectures ? { architectures } : {}),
      ...(value.usage ? { usage: value.usage } : {}),
    };
  }
  if (isTokenRiskReport(value)) {
    return { businessUnit: value.team, reports: [value] };
  }
  throw new SeedLoadError(
    "JSON is not a Token Risk report or a dashboard seed (businessUnit + reports).",
  );
}

function reportKey(report: TokenRiskReport): string {
  return `${report.team}:${report.repo}`;
}

/**
 * Merge one or more Token Risk reports / seeds into a BU rollup seed.
 * Later files win on the same team:repo key.
 */
export function mergeReportsToSeed(
  documents: unknown[],
  businessUnit = "Team rollup",
): DashboardSeed {
  if (documents.length === 0) {
    throw new SeedLoadError("Select at least one Token Risk JSON file.");
  }
  const byKey = new Map<string, TokenRiskReport>();
  let architectures: Record<string, ArchitectureStyle> | undefined;
  let usage: UsageMetrics | undefined;
  for (const document of documents) {
    const seed = parseDashboardDocument(document);
    for (const report of seed.reports) {
      byKey.set(reportKey(report), report);
    }
    if (seed.architectures) {
      architectures = { ...(architectures ?? {}), ...seed.architectures };
    }
    if (seed.usage) {
      usage = seed.usage;
    }
  }
  const reports = [...byKey.values()];
  if (reports.length === 0) {
    throw new SeedLoadError("No Token Risk reports found in the selected files.");
  }
  if (documents.length === 1) {
    const only = parseDashboardDocument(documents[0]);
    return {
      businessUnit: only.businessUnit,
      reports,
      ...(architectures ? { architectures } : {}),
      ...(usage ? { usage } : {}),
    };
  }
  return {
    businessUnit,
    reports,
    ...(architectures ? { architectures } : {}),
    ...(usage ? { usage } : {}),
  };
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

/**
 * Resolve a same-origin path or http(s) URL from a query param.
 * Returns null when missing or unsafe.
 */
export function resolveBootResourceUrl(
  param: string,
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  const raw = new URLSearchParams(search).get(param)?.trim();
  if (!raw) {
    return null;
  }
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Resolve `?src=` from the page URL for boot-time seed load.
 * Allows same-origin absolute paths (`/last-scan.json`) and http(s) URLs.
 * Returns null when missing or unsafe (caller should fall back to demo seed).
 */
export function resolveBootSourceUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return resolveBootResourceUrl("src", search);
}

/**
 * Resolve `?afterUsage=` for boot-time after-period billed usage (#86).
 */
export function resolveBootAfterUsageUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return resolveBootResourceUrl("afterUsage", search);
}

/**
 * Resolve `?usage=` for boot-time baseline billed usage (#94 Prove handoff).
 */
export function resolveBootUsageUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return resolveBootResourceUrl("usage", search);
}

/**
 * Resolve `?markers=` for boot-time Fix change markers (Prove handoff).
 */
export function resolveBootMarkersUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return resolveBootResourceUrl("markers", search);
}

/**
 * Resolve `?session=` for boot-time session-stats.json (Prove handoff).
 */
export function resolveBootSessionUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return resolveBootResourceUrl("session", search);
}

/**
 * Resolve `?discover=` for boot-time discover-latest.json (Prove handoff).
 */
export function resolveBootDiscoverUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return resolveBootResourceUrl("discover", search);
}

/**
 * Resolve `?pack=` for boot-time org prove-pack JSON (F25 Wave A).
 */
export function resolveBootPackUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return resolveBootResourceUrl("pack", search);
}
