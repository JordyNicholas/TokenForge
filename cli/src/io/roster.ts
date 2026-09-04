import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { UsageError } from "../app/errors";

export const ROSTER_FILE = "tokenforge-roster.json";

export type TokenforgeRosterTeam = {
  id: string;
  repo?: string;
  provider?: string;
  role?: string;
};

export type TokenforgeRoster = {
  schemaVersion: 1;
  businessUnit?: string;
  teams: TokenforgeRosterTeam[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse `tokenforge-roster.json` ({ schemaVersion:1, businessUnit?, teams:[…] }). */
export function parseRoster(value: unknown, sourcePath: string): TokenforgeRoster {
  if (!isRecord(value)) {
    throw new UsageError(`${sourcePath} roster must be a JSON object.`);
  }
  if (value.schemaVersion !== 1) {
    throw new UsageError(`${sourcePath} roster schemaVersion must be 1.`);
  }
  if (!Array.isArray(value.teams)) {
    throw new UsageError(`${sourcePath} roster needs { schemaVersion: 1, teams: [...] }.`);
  }
  const teams: TokenforgeRosterTeam[] = [];
  for (const entry of value.teams) {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.length === 0) {
      throw new UsageError(`${sourcePath} roster teams need non-empty id.`);
    }
    teams.push({
      id: entry.id,
      ...(typeof entry.repo === "string" ? { repo: entry.repo } : {}),
      ...(typeof entry.provider === "string" ? { provider: entry.provider } : {}),
      ...(typeof entry.role === "string" ? { role: entry.role } : {}),
    });
  }
  if (teams.length === 0) {
    throw new UsageError(`${sourcePath} roster teams[] is empty.`);
  }
  return {
    schemaVersion: 1,
    ...(typeof value.businessUnit === "string" ? { businessUnit: value.businessUnit } : {}),
    teams,
  };
}

export async function readRosterFromFile(rosterPath: string): Promise<TokenforgeRoster> {
  const abs = resolve(rosterPath);
  let raw: string;
  try {
    raw = await readFile(abs, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new UsageError(`Could not read roster ${abs}: ${message}`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new UsageError(`${abs} is not valid JSON.`);
  }
  return parseRoster(payload, abs);
}

/** Sample roster stub for inbox-init. */
export function sampleRosterStub(businessUnit?: string): TokenforgeRoster {
  return {
    schemaVersion: 1,
    ...(businessUnit ? { businessUnit } : {}),
    teams: [
      { id: "payments", repo: "pay-api", provider: "cursor", role: "fix-on" },
      { id: "checkout", repo: "cart", provider: "copilot" },
    ],
  };
}
