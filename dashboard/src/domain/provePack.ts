import {
  isProveChangeMarker,
  isSessionStatsReport,
  isTokenRiskReport,
  type ProveChangeMarker,
  type SessionStatsReport,
} from "@tokenforge/risk-core";
import { isDashboardSeed, parseDashboardDocument, SeedLoadError, type DashboardSeed } from "./seed";

export type ProvePackDiscoverSummary = {
  missedTokens: number;
  policyGapCount: number;
  sessionKeptCount: number;
  opportunitiesCount?: number;
};

export type SessionStatsEntry = {
  team: string;
  repo: string;
  label: string;
  stats: SessionStatsReport | unknown;
};

export type DiscoverEntry = {
  team: string;
  repo: string;
  label: string;
  summary: ProvePackDiscoverSummary;
};

export type ProvePackCoverage = {
  expectedTeams: string[];
  presentScanTeams: string[];
  missingScans: string[];
  presentSessionTeams: string[];
  missingSessions: string[];
};

export type ProvePackDocument = {
  schemaVersion: 1;
  businessUnit: string;
  createdAt: string;
  seed: DashboardSeed;
  markers: ProveChangeMarker[];
  sessions: SessionStatsEntry[];
  discovers: DiscoverEntry[];
  coverage?: ProvePackCoverage;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSessionStatsEntry(value: unknown): value is SessionStatsEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.team === "string" &&
    value.team.length > 0 &&
    typeof value.repo === "string" &&
    value.repo.length > 0 &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    value.stats !== undefined
  );
}

function isDiscoverSummary(value: unknown): value is ProvePackDiscoverSummary {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.missedTokens === "number" &&
    Number.isFinite(value.missedTokens) &&
    typeof value.policyGapCount === "number" &&
    Number.isFinite(value.policyGapCount) &&
    typeof value.sessionKeptCount === "number" &&
    Number.isFinite(value.sessionKeptCount) &&
    (value.opportunitiesCount === undefined ||
      (typeof value.opportunitiesCount === "number" &&
        Number.isFinite(value.opportunitiesCount)))
  );
}

function isDiscoverEntry(value: unknown): value is DiscoverEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.team === "string" &&
    value.team.length > 0 &&
    typeof value.repo === "string" &&
    value.repo.length > 0 &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    isDiscoverSummary(value.summary)
  );
}

function isProvePackCoverage(value: unknown): value is ProvePackCoverage {
  if (!isRecord(value)) {
    return false;
  }
  const stringArrays = [
    value.expectedTeams,
    value.presentScanTeams,
    value.missingScans,
    value.presentSessionTeams,
    value.missingSessions,
  ];
  return stringArrays.every(
    (entry) =>
      Array.isArray(entry) && entry.every((team) => typeof team === "string"),
  );
}

export function isProvePack(value: unknown): value is ProvePackDocument {
  if (!isRecord(value)) {
    return false;
  }
  if (value.schemaVersion !== 1) {
    return false;
  }
  if (typeof value.businessUnit !== "string" || value.businessUnit.length === 0) {
    return false;
  }
  if (typeof value.createdAt !== "string" || value.createdAt.length === 0) {
    return false;
  }
  if (!isDashboardSeed(value.seed)) {
    return false;
  }
  if (!Array.isArray(value.markers) || !value.markers.every(isProveChangeMarker)) {
    return false;
  }
  if (!Array.isArray(value.sessions) || !value.sessions.every(isSessionStatsEntry)) {
    return false;
  }
  if (!Array.isArray(value.discovers) || !value.discovers.every(isDiscoverEntry)) {
    return false;
  }
  if (value.coverage !== undefined && !isProvePackCoverage(value.coverage)) {
    return false;
  }
  return true;
}

export function parseProvePackJson(text: string): ProvePackDocument {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new SeedLoadError("Prove pack JSON is not valid JSON.");
  }
  if (!isProvePack(payload)) {
    throw new SeedLoadError(
      "JSON is not an org prove-pack (schemaVersion 1 + seed + markers + sessions + discovers).",
    );
  }
  return {
    schemaVersion: 1,
    businessUnit: payload.businessUnit,
    createdAt: payload.createdAt,
    seed: parseDashboardDocument(payload.seed),
    markers: payload.markers,
    sessions: payload.sessions,
    discovers: payload.discovers,
    ...(payload.coverage ? { coverage: payload.coverage } : {}),
  };
}

export async function parseProvePackFile(file: File): Promise<ProvePackDocument> {
  return parseProvePackJson(await file.text());
}

export function sessionStatsFromEntry(
  entry: SessionStatsEntry,
): SessionStatsReport | null {
  return isSessionStatsReport(entry.stats) ? entry.stats : null;
}

export function discoverSummaryToLatest(
  summary: ProvePackDiscoverSummary,
): {
  missedTokens: number;
  policyGapCount: number;
  sessionKeptCount: number;
  opportunities: [];
} {
  return {
    missedTokens: summary.missedTokens,
    policyGapCount: summary.policyGapCount,
    sessionKeptCount: summary.sessionKeptCount,
    opportunities: [],
  };
}

/** Accept org prove-pack or a bare dashboard seed for convenience. */
export function parseProvePackOrSeed(value: unknown): ProvePackDocument | DashboardSeed {
  if (isProvePack(value)) {
    return parseProvePackJson(JSON.stringify(value));
  }
  if (isTokenRiskReport(value) || isDashboardSeed(value)) {
    return parseDashboardDocument(value);
  }
  throw new SeedLoadError("Expected org prove-pack or dashboard seed JSON.");
}
