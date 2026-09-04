import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isSessionStatsReport, isTokenRiskReport } from "@tokenforge/risk-core";
import { UsageError } from "../../app/errors";
import {
  SCAN_REPORT_FILE,
  SESSION_STATS_FILE,
} from "../../io/paths";

const LAST_SCAN_FILE = "last-scan.json";
import { readRosterFromFile, type TokenforgeRoster } from "../../io/roster";

const INBOX_SKIP_DIRS = new Set([".git", "node_modules", ".idea", "coverage"]);

const SCAN_FILES = [SCAN_REPORT_FILE, LAST_SCAN_FILE] as const;

export type InboxTeamEntry = {
  team: string;
  repo: string;
  tokenforgeDir: string;
  relPath: string;
  hasScan: boolean;
  hasSession: boolean;
  scanMtimeMs: number | null;
  sessionMtimeMs: number | null;
  labelSource: "path" | "artifact" | "unknown";
};

export type InboxValidateIssue =
  | { kind: "missing_team"; teamId: string; message: string }
  | { kind: "local_or_empty_team"; team: string; repo: string; relPath: string; message: string }
  | { kind: "stale"; team: string; repo: string; relPath: string; ageDays: number; message: string };

export type InboxValidateResult = {
  root: string;
  rosterPath: string | null;
  staleDays: number;
  entries: InboxTeamEntry[];
  issues: InboxValidateIssue[];
  ok: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalOrEmptyTeam(team: string): boolean {
  const trimmed = team.trim();
  return trimmed.length === 0 || trimmed === "local" || trimmed === "default";
}

async function readTeamFromScan(tokenforgeDir: string): Promise<string | null> {
  for (const name of SCAN_FILES) {
    try {
      const raw = await readFile(join(tokenforgeDir, name), "utf8");
      const payload: unknown = JSON.parse(raw);
      if (isTokenRiskReport(payload)) {
        return payload.team;
      }
      if (
        isRecord(payload) &&
        Array.isArray(payload.reports) &&
        payload.reports.length > 0 &&
        isTokenRiskReport(payload.reports[0])
      ) {
        return payload.reports[0]!.team;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

async function readTeamFromSession(tokenforgeDir: string): Promise<string | null> {
  try {
    const raw = await readFile(join(tokenforgeDir, SESSION_STATS_FILE), "utf8");
    const payload: unknown = JSON.parse(raw);
    if (isSessionStatsReport(payload)) {
      return payload.team;
    }
  } catch {
    /* missing */
  }
  return null;
}

async function fileMtimeMs(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}

async function findTokenforgeDirs(root: string): Promise<string[]> {
  const found: string[] = [];

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
        if (entry.name === ".tokenforge") {
          found.push(fullPath);
          continue;
        }
        if (INBOX_SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
      }
    }
  }

  await walk(resolve(root));
  return found.sort((a, b) => a.localeCompare(b));
}

function inferTeamRepoFromPath(tokenforgeDir: string, root: string): { team: string; repo: string } {
  const rel = relative(root, tokenforgeDir).replaceAll("\\", "/");
  const parts = rel.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1] === ".tokenforge") {
    const repo = parts[parts.length - 2]!;
    const team = parts.length >= 3 ? parts[parts.length - 3]! : repo;
    return { team, repo };
  }
  const fallback = basename(dirname(tokenforgeDir)) || "local";
  return { team: fallback, repo: fallback };
}

async function buildEntry(tokenforgeDir: string, root: string): Promise<InboxTeamEntry> {
  const fromPath = inferTeamRepoFromPath(tokenforgeDir, root);
  const fromScan = await readTeamFromScan(tokenforgeDir);
  const fromSession = await readTeamFromSession(tokenforgeDir);

  let team = fromPath.team;
  let labelSource: InboxTeamEntry["labelSource"] = "path";
  if (fromScan) {
    team = fromScan;
    labelSource = "artifact";
  } else if (fromSession) {
    team = fromSession;
    labelSource = "artifact";
  } else if (fromPath.team === fromPath.repo) {
    labelSource = "unknown";
  }

  let scanMtimeMs: number | null = null;
  for (const name of SCAN_FILES) {
    const mtime = await fileMtimeMs(join(tokenforgeDir, name));
    if (mtime !== null) {
      scanMtimeMs = scanMtimeMs === null ? mtime : Math.max(scanMtimeMs, mtime);
    }
  }
  const sessionMtimeMs = await fileMtimeMs(join(tokenforgeDir, SESSION_STATS_FILE));

  return {
    team,
    repo: fromPath.repo,
    tokenforgeDir,
    relPath: relative(root, tokenforgeDir).replaceAll("\\", "/"),
    hasScan: scanMtimeMs !== null,
    hasSession: sessionMtimeMs !== null,
    scanMtimeMs,
    sessionMtimeMs,
    labelSource,
  };
}

function collectIssues(
  entries: InboxTeamEntry[],
  roster: TokenforgeRoster | null,
  staleDays: number,
  nowMs: number,
): InboxValidateIssue[] {
  const issues: InboxValidateIssue[] = [];
  const staleMs = staleDays * 24 * 60 * 60 * 1000;

  for (const entry of entries) {
    if (isLocalOrEmptyTeam(entry.team)) {
      issues.push({
        kind: "local_or_empty_team",
        team: entry.team,
        repo: entry.repo,
        relPath: entry.relPath,
        message: `${entry.relPath}: team label is "${entry.team || "(empty)"}" — set tokenforge.team before export`,
      });
    }
    const latestMtime = Math.max(entry.scanMtimeMs ?? 0, entry.sessionMtimeMs ?? 0);
    if (latestMtime > 0 && nowMs - latestMtime > staleMs) {
      const ageDays = Math.floor((nowMs - latestMtime) / (24 * 60 * 60 * 1000));
      issues.push({
        kind: "stale",
        team: entry.team,
        repo: entry.repo,
        relPath: entry.relPath,
        ageDays,
        message: `${entry.relPath}: artifacts stale (${ageDays}d > ${staleDays}d)`,
      });
    }
  }

  if (roster) {
    const presentTeams = new Set(entries.map((e) => e.team));
    for (const expected of roster.teams) {
      const hasFolder = entries.some(
        (e) => e.team === expected.id || e.repo === (expected.repo ?? expected.id),
      );
      if (!hasFolder && !presentTeams.has(expected.id)) {
        issues.push({
          kind: "missing_team",
          teamId: expected.id,
          message: `Roster team "${expected.id}" has no inbox folder with .tokenforge/ artifacts`,
        });
      }
    }
  }

  return issues;
}

export type InboxValidateOptions = {
  root: string;
  roster?: string;
  staleDays?: number;
  nowMs?: number;
};

/** Walk inbox for scans/sessions; compare vs roster and freshness. */
export async function validateInbox(options: InboxValidateOptions): Promise<InboxValidateResult> {
  const root = resolve(options.root);
  let rootStat;
  try {
    rootStat = await stat(root);
  } catch {
    throw new UsageError(`Directory not found: ${root}`);
  }
  if (!rootStat.isDirectory()) {
    throw new UsageError(`inbox-validate expects a directory path, got ${root}`);
  }

  const staleDays = options.staleDays ?? 7;
  const nowMs = options.nowMs ?? Date.now();

  let roster: TokenforgeRoster | null = null;
  let rosterPath: string | null = null;
  if (options.roster) {
    rosterPath = resolve(options.roster);
    roster = await readRosterFromFile(rosterPath);
  }

  const tokenforgeDirs = await findTokenforgeDirs(root);
  const entries: InboxTeamEntry[] = [];
  for (const dir of tokenforgeDirs) {
    entries.push(await buildEntry(dir, root));
  }

  const issues = collectIssues(entries, roster, staleDays, nowMs);

  return {
    root,
    rosterPath,
    staleDays,
    entries,
    issues,
    ok: issues.length === 0,
  };
}
