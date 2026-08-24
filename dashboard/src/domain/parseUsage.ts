/**
 * FinOps CSV/JSON → existing UsageMetrics contract (#85).
 * Not a live vendor billing API and not a second usage schema.
 */
import { isUsageMetrics, type UsageMetrics, type UsageTeamRow } from "./usage";

export class UsageLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageLoadError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const TEAM_KEYS = ["team", "team_id", "teamid", "org", "organization", "repository", "repo"];
const CREDITS_KEYS = [
  "creditsused",
  "credits_used",
  "credits",
  "tokens",
  "token_credits",
  "tokencredits",
];
const USD_KEYS = [
  "estimatedusd",
  "estimated_usd",
  "usd",
  "cost",
  "costusd",
  "cost_usd",
  "amount",
  "spend",
];
const PROVIDER_KEYS = ["providerlabel", "provider_label", "provider"];
const PERIOD_KEYS = ["period", "billingperiod", "billing_period", "month"];

function normalizeHeader(raw: string): string {
  return raw.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/[\s-]+/g, "_");
}

function parseNumber(raw: string, field: string, row: number): number {
  const cleaned = raw.trim().replace(/[$,]/g, "");
  if (cleaned.length === 0) {
    throw new UsageLoadError(`Row ${row}: ${field} is empty.`);
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new UsageLoadError(`Row ${row}: ${field} is not a number (${raw}).`);
  }
  return value;
}

function pickAlias(
  headers: string[],
  aliases: string[],
): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function parseMetaLine(line: string): { key: string; value: string } | null {
  const body = line.replace(/^#\s*/, "").trim();
  const match = body.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.+)$/);
  if (!match) {
    return null;
  }
  return { key: normalizeHeader(match[1]), value: match[2].trim() };
}

function mergeTeams(rows: UsageTeamRow[]): UsageTeamRow[] {
  const byTeam = new Map<string, UsageTeamRow>();
  for (const row of rows) {
    const existing = byTeam.get(row.team);
    if (!existing) {
      byTeam.set(row.team, { ...row });
      continue;
    }
    existing.creditsUsed += row.creditsUsed;
    existing.estimatedUsd += row.estimatedUsd;
  }
  return [...byTeam.values()];
}

function totalsFromTeams(teams: UsageTeamRow[]): UsageMetrics["totals"] {
  return teams.reduce(
    (acc, row) => ({
      creditsUsed: acc.creditsUsed + row.creditsUsed,
      estimatedUsd: acc.estimatedUsd + row.estimatedUsd,
    }),
    { creditsUsed: 0, estimatedUsd: 0 },
  );
}

export function normalizeUsageMetrics(
  value: unknown,
  source: UsageMetrics["source"] = "import",
): UsageMetrics {
  if (!isRecord(value)) {
    throw new UsageLoadError("Usage document must be a JSON object.");
  }
  const nested = value.usage;
  if (nested !== undefined) {
    return normalizeUsageMetrics(nested, source);
  }
  if (!Array.isArray(value.teams) || value.teams.length === 0) {
    throw new UsageLoadError("Usage document needs a non-empty teams array.");
  }
  const teams = mergeTeams(
    value.teams.map((row, index) => {
      if (!isRecord(row) || typeof row.team !== "string" || row.team.trim().length === 0) {
        throw new UsageLoadError(`Team row ${index + 1} is missing a team name.`);
      }
      if (typeof row.creditsUsed !== "number" || !Number.isFinite(row.creditsUsed)) {
        throw new UsageLoadError(`Team "${row.team}" is missing numeric creditsUsed.`);
      }
      if (typeof row.estimatedUsd !== "number" || !Number.isFinite(row.estimatedUsd)) {
        throw new UsageLoadError(`Team "${row.team}" is missing numeric estimatedUsd.`);
      }
      return {
        team: row.team.trim(),
        creditsUsed: row.creditsUsed,
        estimatedUsd: row.estimatedUsd,
      };
    }),
  );
  const providerLabel =
    typeof value.providerLabel === "string" && value.providerLabel.trim()
      ? value.providerLabel.trim()
      : "imported export";
  const period =
    typeof value.period === "string" && value.period.trim()
      ? value.period.trim()
      : "unspecified";
  const totals =
    isRecord(value.totals) &&
    typeof value.totals.creditsUsed === "number" &&
    Number.isFinite(value.totals.creditsUsed) &&
    typeof value.totals.estimatedUsd === "number" &&
    Number.isFinite(value.totals.estimatedUsd)
      ? {
          creditsUsed: value.totals.creditsUsed,
          estimatedUsd: value.totals.estimatedUsd,
        }
      : totalsFromTeams(teams);
  const metrics: UsageMetrics = {
    source,
    providerLabel,
    period,
    teams,
    totals,
  };
  if (!isUsageMetrics(metrics)) {
    throw new UsageLoadError("Usage document does not match UsageMetrics.");
  }
  return metrics;
}

export function parseUsageJson(text: string, source: UsageMetrics["source"] = "import"): UsageMetrics {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new UsageLoadError("File is not JSON.");
  }
  if (Array.isArray(payload)) {
    return normalizeUsageMetrics({ teams: payload }, source);
  }
  return normalizeUsageMetrics(payload, source);
}

export function parseUsageCsv(text: string): UsageMetrics {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  let providerLabel = "imported export";
  let period = "unspecified";
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed.startsWith("#")) {
      const meta = parseMetaLine(trimmed);
      if (!meta) {
        continue;
      }
      if (PROVIDER_KEYS.includes(meta.key)) {
        providerLabel = meta.value;
      } else if (PERIOD_KEYS.includes(meta.key)) {
        period = meta.value;
      }
      continue;
    }
    headerIndex = i;
    break;
  }
  if (headerIndex < 0) {
    throw new UsageLoadError("CSV is missing a header row.");
  }
  const headers = splitCsvLine(lines[headerIndex]).map(normalizeHeader);
  const teamIdx = pickAlias(headers, TEAM_KEYS);
  const creditsIdx = pickAlias(headers, CREDITS_KEYS);
  const usdIdx = pickAlias(headers, USD_KEYS);
  const providerIdx = pickAlias(headers, PROVIDER_KEYS);
  const periodIdx = pickAlias(headers, PERIOD_KEYS);
  if (teamIdx < 0 || creditsIdx < 0 || usdIdx < 0) {
    throw new UsageLoadError(
      "CSV needs team, credits, and $ columns (aliases: org/repo, tokens/credits, cost/usd).",
    );
  }
  const rows: UsageTeamRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim().length === 0 || raw.trim().startsWith("#")) {
      continue;
    }
    const cells = splitCsvLine(raw);
    const team = (cells[teamIdx] ?? "").trim();
    if (team.length === 0) {
      throw new UsageLoadError(`Row ${i + 1}: team is empty.`);
    }
    if (providerIdx >= 0 && (cells[providerIdx] ?? "").trim()) {
      providerLabel = cells[providerIdx].trim();
    }
    if (periodIdx >= 0 && (cells[periodIdx] ?? "").trim()) {
      period = cells[periodIdx].trim();
    }
    rows.push({
      team,
      creditsUsed: parseNumber(cells[creditsIdx] ?? "", "credits", i + 1),
      estimatedUsd: parseNumber(cells[usdIdx] ?? "", "usd", i + 1),
    });
  }
  if (rows.length === 0) {
    throw new UsageLoadError("CSV has headers but no team rows.");
  }
  const teams = mergeTeams(rows);
  return {
    source: "import",
    providerLabel,
    period,
    teams,
    totals: totalsFromTeams(teams),
  };
}

export function parseUsageText(text: string, fileName: string): UsageMetrics {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseUsageCsv(text);
  }
  if (lower.endsWith(".json")) {
    return parseUsageJson(text, "import");
  }
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseUsageJson(text, "import");
  }
  return parseUsageCsv(text);
}

export async function parseUsageFile(file: File): Promise<UsageMetrics> {
  return parseUsageText(await file.text(), file.name);
}
