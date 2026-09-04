import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
  isProveChangeMarker,
  isSessionStatsReport,
  isTokenRiskReport,
  type ProveChangeMarker,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../../app/errors";
import {
  DISCOVER_LATEST_FILE,
  PROVE_CHANGE_LATEST_FILE,
  SCAN_REPORT_FILE,
  SESSION_STATS_FILE,
} from "../../io/paths";
import { parseRoster, type TokenforgeRoster, type TokenforgeRosterTeam } from "../../io/roster";
import {
  LAST_SCAN_FILE,
  mergeScanDocuments,
  type DashboardSeed,
} from "../org-seed/org-seed";

/** Directories skipped during prove-pack walk (`.tokenforge` is intentionally kept). */
const PROVE_PACK_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".idea",
  "coverage",
]);

const SCAN_BASENAMES = new Set([SCAN_REPORT_FILE, LAST_SCAN_FILE]);
const ARTIFACT_BASENAMES = new Set([
  ...SCAN_BASENAMES,
  PROVE_CHANGE_LATEST_FILE,
  SESSION_STATS_FILE,
  DISCOVER_LATEST_FILE,
]);

export type ProvePackSessionEntry = {
  team: string;
  repo: string;
  label: string;
  stats: unknown;
};

export type ProvePackDiscoverSummary = {
  missedTokens: number;
  policyGapCount: number;
  sessionKeptCount: number;
  opportunitiesCount: number;
};

export type ProvePackDiscoverEntry = {
  team: string;
  repo: string;
  label: string;
  summary: ProvePackDiscoverSummary;
};

export type ProvePackRosterTeam = TokenforgeRosterTeam;
export type ProvePackRoster = Pick<TokenforgeRoster, "teams">;

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
  sessions: ProvePackSessionEntry[];
  discovers: ProvePackDiscoverEntry[];
  coverage?: ProvePackCoverage;
};

export type ProvePackOptions = {
  /** Root directory to walk for Prove artifacts. */
  root: string;
  /** BU label for multi-repo rollup (default: directory name). */
  businessUnit?: string;
  /** Output path (default: `<root>/org-prove-pack.json`). */
  out?: string;
  /** Optional roster JSON path for coverage gaps. */
  roster?: string;
};

export type ProvePackResult = {
  businessUnit: string;
  reportCount: number;
  markerCount: number;
  sessionCount: number;
  discoverCount: number;
  sourceFiles: string[];
  outPath: string;
  pack: ProvePackDocument;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScanDocument(value: unknown, sourcePath: string): DashboardSeed {
  if (isTokenRiskReport(value)) {
    return { businessUnit: value.team, reports: [value] };
  }
  if (
    isRecord(value) &&
    typeof value.businessUnit === "string" &&
    value.businessUnit.length > 0 &&
    Array.isArray(value.reports) &&
    value.reports.every(isTokenRiskReport)
  ) {
    return {
      businessUnit: value.businessUnit,
      reports: value.reports as TokenRiskReport[],
    };
  }
  throw new UsageError(
    `${sourcePath} is not a Token Risk report or dashboard seed (businessUnit + reports).`,
  );
}

export function parseChangeMarkersPayload(value: unknown, sourcePath: string): ProveChangeMarker[] {
  if (isProveChangeMarker(value)) {
    return [value];
  }
  if (Array.isArray(value)) {
    if (!value.every(isProveChangeMarker)) {
      throw new UsageError(`${sourcePath} markers array has invalid entries.`);
    }
    return value;
  }
  if (isRecord(value) && Array.isArray(value.markers)) {
    if (!value.markers.every(isProveChangeMarker)) {
      throw new UsageError(`${sourcePath} markers[] has invalid entries.`);
    }
    return value.markers;
  }
  throw new UsageError(
    `${sourcePath} is not a ProveChangeMarker, array, or { markers: [...] }.`,
  );
}

function inferTeamRepoFromPath(tokenforgeDir: string, root: string): { team: string; repo: string } | null {
  const rel = relative(root, tokenforgeDir).replaceAll("\\", "/");
  const parts = rel.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1] === ".tokenforge") {
    const repo = parts[parts.length - 2]!;
    const team = parts.length >= 3 ? parts[parts.length - 3]! : repo;
    return { team, repo };
  }
  return null;
}

async function readScanContext(
  tokenforgeDir: string,
): Promise<{ team: string; repo: string } | null> {
  for (const name of [SCAN_REPORT_FILE, LAST_SCAN_FILE]) {
    try {
      const raw = await readFile(join(tokenforgeDir, name), "utf8");
      const payload: unknown = JSON.parse(raw);
      if (isTokenRiskReport(payload)) {
        return { team: payload.team, repo: payload.repo };
      }
      if (
        isRecord(payload) &&
        Array.isArray(payload.reports) &&
        payload.reports.length > 0 &&
        isTokenRiskReport(payload.reports[0])
      ) {
        const report = payload.reports[0] as TokenRiskReport;
        return { team: report.team, repo: report.repo };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

async function resolveTeamRepo(
  filePath: string,
  root: string,
  sessionPayload?: unknown,
): Promise<{ team: string; repo: string }> {
  const tokenforgeDir =
    basename(dirname(filePath)) === ".tokenforge" ? dirname(filePath) : null;

  if (sessionPayload && isSessionStatsReport(sessionPayload)) {
    return { team: sessionPayload.team, repo: sessionPayload.repo };
  }

  if (tokenforgeDir) {
    const fromScan = await readScanContext(tokenforgeDir);
    if (fromScan) {
      return fromScan;
    }
    const fromPath = inferTeamRepoFromPath(tokenforgeDir, root);
    if (fromPath) {
      return fromPath;
    }
  }

  const fallback = basename(dirname(filePath)) || "local";
  return { team: fallback, repo: fallback };
}

function parseDiscoverSummary(value: unknown, sourcePath: string): ProvePackDiscoverSummary {
  if (!isRecord(value)) {
    throw new UsageError(`${sourcePath} discover JSON is not an object.`);
  }
  const opportunities = Array.isArray(value.opportunities) ? value.opportunities : [];
  let policyGapCount = 0;
  let sessionKeptCount = 0;
  for (const entry of opportunities) {
    if (!isRecord(entry)) {
      continue;
    }
    const tag =
      typeof entry.category === "string"
        ? entry.category
        : typeof entry.kind === "string"
          ? entry.kind
          : "";
    if (tag === "policy_gap") {
      policyGapCount += 1;
    } else if (tag === "session_kept") {
      sessionKeptCount += 1;
    }
  }
  const missedTokens =
    typeof value.missedTokens === "number" && Number.isFinite(value.missedTokens)
      ? value.missedTokens
      : opportunities.reduce((sum, entry) => {
          if (!isRecord(entry) || typeof entry.estTokens !== "number") {
            return sum;
          }
          return sum + entry.estTokens;
        }, 0);

  return {
    missedTokens,
    policyGapCount,
    sessionKeptCount,
    opportunitiesCount: opportunities.length,
  };
}

async function walkArtifactPaths(root: string): Promise<string[]> {
  const found: string[] = [];
  const rootResolved = resolve(root);

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (PROVE_PACK_SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && ARTIFACT_BASENAMES.has(entry.name)) {
        found.push(fullPath);
      }
    }
  }

  await walk(rootResolved);
  return found.sort((a, b) => a.localeCompare(b));
}

async function readJsonFile(filePath: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Could not read ${filePath}: ${message}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new UsageError(`${filePath} is not valid JSON.`);
  }
}

export function computeProvePackCoverage(
  roster: ProvePackRoster,
  seed: DashboardSeed,
  sessions: ProvePackSessionEntry[],
): ProvePackCoverage {
  const expectedTeams = roster.teams.map((team) => team.id).sort((a, b) => a.localeCompare(b));
  const presentScanTeams = [...new Set(seed.reports.map((report) => report.team))].sort((a, b) =>
    a.localeCompare(b),
  );
  const presentSessionTeams = [...new Set(sessions.map((entry) => entry.team))].sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    expectedTeams,
    presentScanTeams,
    missingScans: expectedTeams.filter((team) => !presentScanTeams.includes(team)),
    presentSessionTeams,
    missingSessions: expectedTeams.filter((team) => !presentSessionTeams.includes(team)),
  };
}

/**
 * Roll up Detect + Prove artifacts under a directory tree into one org prove-pack JSON.
 */
export async function rollupProvePack(options: ProvePackOptions): Promise<ProvePackResult> {
  const root = resolve(options.root);
  let rootStat;
  try {
    rootStat = await stat(root);
  } catch {
    throw new UsageError(`Directory not found: ${root}`);
  }
  if (!rootStat.isDirectory()) {
    throw new UsageError(`prove-pack expects a directory path, got ${root}`);
  }

  const artifactPaths = await walkArtifactPaths(root);
  if (artifactPaths.length === 0) {
    throw new UsageError(
      `No scan, marker, session, or discover JSON files found under ${root}.`,
    );
  }

  const scanDocuments: DashboardSeed[] = [];
  const markers: ProveChangeMarker[] = [];
  const sessions: ProvePackSessionEntry[] = [];
  const discovers: ProvePackDiscoverEntry[] = [];
  const sourceFiles: string[] = [];

  for (const filePath of artifactPaths) {
    const base = basename(filePath);
    const relPath = relative(root, filePath).replaceAll("\\", "/");
    sourceFiles.push(relPath);
    const payload = await readJsonFile(filePath);

    if (SCAN_BASENAMES.has(base)) {
      scanDocuments.push(parseScanDocument(payload, filePath));
      continue;
    }

    if (base === PROVE_CHANGE_LATEST_FILE) {
      markers.push(...parseChangeMarkersPayload(payload, filePath));
      continue;
    }

    if (base === SESSION_STATS_FILE) {
      const { team, repo } = await resolveTeamRepo(filePath, root, payload);
      sessions.push({
        team,
        repo,
        label: relPath,
        stats: payload,
      });
      continue;
    }

    if (base === DISCOVER_LATEST_FILE) {
      const { team, repo } = await resolveTeamRepo(filePath, root);
      discovers.push({
        team,
        repo,
        label: relPath,
        summary: parseDiscoverSummary(payload, filePath),
      });
    }
  }

  if (scanDocuments.length === 0) {
    throw new UsageError(
      `No ${SCAN_REPORT_FILE} or ${LAST_SCAN_FILE} files found under ${root}.`,
    );
  }

  const businessUnit =
    options.businessUnit?.trim() ||
    basename(root) ||
    "Org rollup";
  const seed = mergeScanDocuments(scanDocuments, businessUnit);

  let roster: ProvePackRoster | undefined;
  if (options.roster) {
    const rosterPath = resolve(options.roster);
    const parsed = parseRoster(await readJsonFile(rosterPath), rosterPath);
    roster = { teams: parsed.teams };
  }

  const pack: ProvePackDocument = {
    schemaVersion: 1,
    businessUnit: seed.businessUnit,
    createdAt: new Date().toISOString(),
    seed,
    markers,
    sessions,
    discovers,
    ...(roster ? { coverage: computeProvePackCoverage(roster, seed, sessions) } : {}),
  };

  const outPath = resolve(options.out ?? join(root, "org-prove-pack.json"));
  await writeFile(outPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

  return {
    businessUnit: pack.businessUnit,
    reportCount: seed.reports.length,
    markerCount: markers.length,
    sessionCount: sessions.length,
    discoverCount: discovers.length,
    sourceFiles,
    outPath,
    pack,
  };
}
