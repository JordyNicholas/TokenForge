import { SeedLoadError } from "./seed";

export type DiscoverLatestRow = {
  path: string;
  estTokens: number;
  category: "policy_gap" | "session_kept" | "other";
};

export type DiscoverLatestSummary = {
  missedTokens: number;
  policyGapCount: number;
  sessionKeptCount: number;
  opportunities: DiscoverLatestRow[];
  timestamp?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rowCategory(raw: Record<string, unknown>): DiscoverLatestRow["category"] {
  const tag =
    typeof raw.category === "string"
      ? raw.category
      : typeof raw.kind === "string"
        ? raw.kind
        : "";
  if (tag === "policy_gap") {
    return "policy_gap";
  }
  if (tag === "session_kept") {
    return "session_kept";
  }
  return "other";
}

/**
 * Parse CLI `.tokenforge/discover-latest.json` or extension discover export.
 * Tolerates `category` (CLI) and `kind` (extension) opportunity tags.
 */
export function parseDiscoverLatestJson(text: string): DiscoverLatestSummary {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new SeedLoadError("Discover JSON is not valid JSON.");
  }
  if (!isRecord(payload) || !Array.isArray(payload.opportunities)) {
    throw new SeedLoadError(
      "Discover JSON needs an opportunities array (CLI discover-latest or extension export).",
    );
  }

  const opportunities: DiscoverLatestRow[] = [];
  for (const entry of payload.opportunities) {
    if (!isRecord(entry) || typeof entry.path !== "string" || entry.path.length === 0) {
      continue;
    }
    const estTokens =
      typeof entry.estTokens === "number" && Number.isFinite(entry.estTokens)
        ? entry.estTokens
        : 0;
    opportunities.push({
      path: entry.path,
      estTokens,
      category: rowCategory(entry),
    });
  }

  const policyGapCount = opportunities.filter((row) => row.category === "policy_gap").length;
  const sessionKeptCount = opportunities.filter(
    (row) => row.category === "session_kept",
  ).length;
  const missedTokens =
    typeof payload.missedTokens === "number" && Number.isFinite(payload.missedTokens)
      ? payload.missedTokens
      : opportunities.reduce((sum, row) => sum + row.estTokens, 0);

  return {
    missedTokens,
    policyGapCount,
    sessionKeptCount,
    opportunities,
    ...(typeof payload.timestamp === "string" ? { timestamp: payload.timestamp } : {}),
  };
}

export async function parseDiscoverLatestFile(file: File): Promise<DiscoverLatestSummary> {
  return parseDiscoverLatestJson(await file.text());
}
