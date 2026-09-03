import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  completeJson,
  parseLlmSpec,
  parseLlmTimeoutSeconds,
} from "@tokenforge/enrichers";
import { exclusionPathForProvider } from "@tokenforge/policy-adapters";
import {
  discoverMissedOpportunities,
  isTokenRiskReport,
  missedOpportunityTokens,
  type ProviderId,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { isExternalBackend, readLlmSettings } from "../enrich/settings";
import { auditMcpConfigs, type McpAuditFinding } from "./mcpAudit";
import { monorepoScopeHint, type MonorepoHint } from "./monorepoHints";
import { parseExclusionYaml } from "./parseExclusionYaml";

export type DiscoverCandidate = {
  path: string;
  delta: "added" | "changed";
  score: number;
  kind?: "file" | "mcp" | "monorepo" | "policy_gap" | "session_kept";
  note?: string;
  estTokens?: number;
};

export type JsonJudgeFn = (prompt: string) => Promise<unknown>;

export type DiscoverWorkspaceOptions = {
  maxResults?: number;
  sinceMs?: number;
  editorPath?: string;
  report?: TokenRiskReport;
  provider?: ProviderId;
  writeReport?: boolean;
  enrichmentEnabled?: boolean;
  judge?: JsonJudgeFn;
};

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".tokenforge"]);
export const DISCOVER_LATEST_REL = ".tokenforge/discover-latest.json";
const MAX_RANK = 16;

type DiscoverLatestFile = {
  timestamp: string;
  missedTokens: number;
  opportunities: DiscoverCandidate[];
};

async function loadAppliedPatterns(root: string, provider: ProviderId): Promise<string[]> {
  const rel = exclusionPathForProvider(provider);
  try {
    const contents = await readFile(join(root, rel), "utf8");
    return parseExclusionYaml(contents);
  } catch {
    return [];
  }
}

async function loadLastScan(root: string): Promise<TokenRiskReport | undefined> {
  try {
    const raw = JSON.parse(await readFile(join(root, ".tokenforge/last-scan.json"), "utf8")) as unknown;
    return isTokenRiskReport(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

async function lastDiscoverCutoffMs(root: string): Promise<number | undefined> {
  try {
    const parsed = JSON.parse(await readFile(join(root, DISCOVER_LATEST_REL), "utf8")) as {
      timestamp?: string;
    };
    if (typeof parsed.timestamp !== "string") {
      return undefined;
    }
    const ms = Date.parse(parsed.timestamp);
    return Number.isFinite(ms) ? ms : undefined;
  } catch {
    return undefined;
  }
}

async function walkRecentFiles(
  root: string,
  cutoff: number,
  sinceMs: number,
): Promise<DiscoverCandidate[]> {
  const found: DiscoverCandidate[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      let mtimeMs = 0;
      let size = 0;
      try {
        const info = await stat(abs);
        mtimeMs = info.mtimeMs;
        size = info.size;
      } catch {
        continue;
      }
      if (mtimeMs < cutoff) {
        continue;
      }
      const rel = relative(root, abs).replaceAll("\\", "/");
      found.push({
        path: rel,
        delta: "changed",
        score: Math.min(100, Math.round(size / 1024) + (mtimeMs - cutoff) / Math.max(sinceMs, 1)),
        kind: "file",
        note: "Changed since last discover / lookback window",
      });
    }
  }

  await walk(root);
  return found;
}

function missedToCandidates(
  report: TokenRiskReport,
  patterns: readonly string[],
): DiscoverCandidate[] {
  const rows = discoverMissedOpportunities(report, patterns);
  return rows.map((row) => ({
    path: row.path,
    delta: "changed" as const,
    score: Math.min(100, 40 + Math.round(row.estTokens / 50)),
    kind: row.category,
    estTokens: row.estTokens,
    note:
      row.category === "policy_gap"
        ? `Policy gap — scan would exclude (~${row.estTokens} tok) but ignore/policy does not cover it`
        : `Session kept — still in context cost (~${row.estTokens} tok); Shield to drop it`,
  }));
}

export function buildDiscoverRankPrompt(items: readonly DiscoverCandidate[]): string {
  const lines = items.map(
    (item) =>
      `- path=${item.path} kind=${item.kind ?? "file"} score=${item.score}` +
      (item.estTokens !== undefined ? ` estTokens=${item.estTokens}` : "") +
      (item.note ? ` note=${item.note}` : ""),
  );
  return [
    "You rank TokenForge Discover opportunities for a coding-agent FinOps session.",
    "Prefer policy_gap and session_kept (real missed savings) over mere recent mtimes.",
    "Do not invent paths. Return JSON only:",
    `{"rankedPaths":["<exact path>", "..."]}`,
    `At most ${MAX_RANK} paths, highest priority first.`,
    "",
    "Candidates:",
    ...lines,
  ].join("\n");
}

function parseRanked(payload: unknown, allowed: ReadonlySet<string>): string[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }
  const ranked = (payload as { rankedPaths?: unknown }).rankedPaths;
  if (!Array.isArray(ranked)) {
    return [];
  }
  const out: string[] = [];
  for (const item of ranked) {
    if (typeof item !== "string" || !allowed.has(item) || out.includes(item)) {
      continue;
    }
    out.push(item);
    if (out.length >= MAX_RANK) {
      break;
    }
  }
  return out;
}

async function defaultJudge(prompt: string): Promise<unknown> {
  const settings = readLlmSettings();
  const spec = parseLlmSpec(settings.llm);
  if (isExternalBackend(spec.backend) && !settings.allowExternal) {
    throw new Error("external llm blocked");
  }
  const timeoutMs =
    settings.timeoutSeconds !== undefined
      ? parseLlmTimeoutSeconds(String(settings.timeoutSeconds))
      : undefined;
  return completeJson({
    backend: spec.backend,
    model: spec.model,
    prompt,
    endpoint: settings.endpoint,
    timeoutMs,
  });
}

function mergeUnique(items: DiscoverCandidate[]): DiscoverCandidate[] {
  const byPath = new Map<string, DiscoverCandidate>();
  const priority: Record<NonNullable<DiscoverCandidate["kind"]>, number> = {
    policy_gap: 5,
    session_kept: 4,
    mcp: 3,
    monorepo: 2,
    file: 1,
  };
  for (const item of items) {
    const existing = byPath.get(item.path);
    if (!existing) {
      byPath.set(item.path, item);
      continue;
    }
    const nextPri = priority[item.kind ?? "file"] ?? 0;
    const prevPri = priority[existing.kind ?? "file"] ?? 0;
    if (nextPri > prevPri) {
      byPath.set(item.path, item);
    }
  }
  return [...byPath.values()];
}

async function persistDiscover(
  root: string,
  items: readonly DiscoverCandidate[],
  missedTokens: number,
): Promise<void> {
  const file = join(root, DISCOVER_LATEST_REL);
  await mkdir(join(root, ".tokenforge"), { recursive: true });
  const payload: DiscoverLatestFile = {
    timestamp: new Date().toISOString(),
    missedTokens,
    opportunities: [...items],
  };
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/** Delta + missed Fix opportunities + MCP/monorepo; optional LLM rank (#269/#270/#274). */
export async function discoverRecentChanges(
  root: string,
  options: DiscoverWorkspaceOptions = {},
): Promise<DiscoverCandidate[]> {
  const maxResults = options.maxResults ?? 12;
  const sinceMs = options.sinceMs ?? 24 * 60 * 60 * 1000;
  const provider = options.provider ?? options.report?.provider ?? "generic";
  const report = options.report ?? (await loadLastScan(root));
  const lastRun = await lastDiscoverCutoffMs(root);
  const cutoff = lastRun ?? Date.now() - sinceMs;

  const collected: DiscoverCandidate[] = [];
  let missedTokens = 0;

  if (report) {
    const patterns = await loadAppliedPatterns(root, provider);
    const missed = missedToCandidates(report, patterns);
    missedTokens = missedOpportunityTokens(
      discoverMissedOpportunities(report, patterns),
    );
    collected.push(...missed);
  }

  collected.push(...(await walkRecentFiles(root, cutoff, sinceMs)));

  const mcpFindings: McpAuditFinding[] = await auditMcpConfigs(root);
  for (const finding of mcpFindings) {
    collected.push({
      path: finding.path,
      delta: "changed",
      score: finding.score,
      kind: "mcp",
      note: finding.issue,
    });
  }

  if (options.editorPath) {
    const hint: MonorepoHint | undefined = monorepoScopeHint(root, options.editorPath);
    if (hint) {
      collected.push({
        path: hint.packageRoot,
        delta: "changed",
        score: 55,
        kind: "monorepo",
        note: hint.note,
      });
    }
  }

  let merged = mergeUnique(collected).sort((a, b) => b.score - a.score);

  const enrichmentEnabled =
    options.enrichmentEnabled ?? readLlmSettings().enrichmentEnabled;
  if (enrichmentEnabled && merged.length > 1) {
    const slice = merged.slice(0, MAX_RANK);
    const allowed = new Set(slice.map((item) => item.path));
    const judge = options.judge ?? defaultJudge;
    try {
      const payload = await judge(buildDiscoverRankPrompt(slice));
      const ranked = parseRanked(payload, allowed);
      if (ranked.length > 0) {
        const byPath = new Map(slice.map((item) => [item.path, item]));
        merged = [
          ...ranked.map((path) => byPath.get(path)!),
          ...merged.filter((item) => !ranked.includes(item.path)),
        ];
      }
    } catch {
      /* keep heuristic order */
    }
  }

  const result = merged.slice(0, maxResults);
  if (options.writeReport === true) {
    await persistDiscover(root, result, missedTokens);
  }
  return result;
}
