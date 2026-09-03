import { createHash } from "node:crypto";
import {
  completeJson,
  parseLlmSpec,
  parseLlmTimeoutSeconds,
} from "@tokenforge/enrichers";
import { isExternalBackend, readLlmSettings } from "../enrich/settings";
import type { ShieldSession } from "../session/shieldSession";
import { idleHintForTab } from "../tabs/idleHint";
import type { TrackedTab } from "../tabs/types";

export type TaskContextPack = {
  paths: readonly string[];
  estTokens: number;
  note: string;
  /** True when paths came from a bounded LLM rank rather than token sort. */
  source: "heuristic" | "llm";
};

export type TabRankSignal = {
  path: string;
  fileClass: string;
  estTokens: number;
  focused: boolean;
  idle: boolean;
  reasons: readonly string[];
};

export type JsonJudgeFn = (prompt: string) => Promise<unknown>;

export type BuildTaskContextPackOptions = {
  /** Optional short task description from Prepare-session. */
  taskPrompt?: string;
  /** Injected JSON judge (tests). When omitted, uses local Ollama via enrichers. */
  judge?: JsonJudgeFn;
  /** Force enrichment on/off (tests). Defaults to workspace setting. */
  enrichmentEnabled?: boolean;
  nowMs?: number;
};

const MAX_RANK_CANDIDATES = 24;
const MAX_PACK_PATHS = 8;

type CacheEntry = {
  key: string;
  pack: TaskContextPack;
};

let packCache: CacheEntry | undefined;
let inflight: Promise<TaskContextPack> | undefined;
let inflightKey: string | undefined;

/** Test seam — clear the in-memory LLM pack cache. */
export function clearTaskContextPackCache(): void {
  packCache = undefined;
  inflight = undefined;
  inflightKey = undefined;
}

export function collectTabRankSignals(
  session: ShieldSession,
  nowMs: number = Date.now(),
): TabRankSignal[] {
  const activeUri = session.registry.getActiveUri();
  const tabs = session
    .listDisplayAtRisk(nowMs)
    .slice()
    .sort((a, b) => b.assessment.estTokens - a.assessment.estTokens)
    .slice(0, MAX_RANK_CANDIDATES);

  return tabs.map((tab) => toSignal(tab, activeUri, nowMs));
}

function toSignal(
  tab: TrackedTab,
  activeUri: string | undefined,
  nowMs: number,
): TabRankSignal {
  const focused = activeUri === tab.uri;
  const idle =
    tab.assessment.reasons.includes("inactive_tab") ||
    idleHintForTab(tab, nowMs, { background: !focused })?.kind === "idle_for";
  return {
    path: tab.path,
    fileClass: tab.assessment.fileClass,
    estTokens: tab.assessment.estTokens,
    focused,
    idle,
    reasons: tab.assessment.reasons,
  };
}

function packFromPaths(
  paths: readonly string[],
  tabs: readonly TrackedTab[],
  note: string,
  source: TaskContextPack["source"],
): TaskContextPack {
  const byPath = new Map(tabs.map((tab) => [tab.path, tab]));
  const ordered = paths
    .map((path) => byPath.get(path))
    .filter((tab): tab is TrackedTab => tab !== undefined)
    .slice(0, MAX_PACK_PATHS);
  const estTokens = ordered.reduce((sum, tab) => sum + tab.assessment.estTokens, 0);
  return {
    paths: ordered.map((tab) => tab.path),
    estTokens,
    note,
    source,
  };
}

/** Heuristic stub — top allowed/pending tabs by token size (no model call). */
export function buildHeuristicTaskContextPack(
  session: ShieldSession,
  nowMs: number = Date.now(),
): TaskContextPack {
  const tabs = session
    .listDisplayAtRisk(nowMs)
    .slice()
    .sort((a, b) => b.assessment.estTokens - a.assessment.estTokens)
    .slice(0, MAX_PACK_PATHS);
  return packFromPaths(
    tabs.map((tab) => tab.path),
    tabs,
    "Estimate-only task focus list — not sent to any agent pipeline.",
    "heuristic",
  );
}

function signalsCacheKey(
  signals: readonly TabRankSignal[],
  taskPrompt: string | undefined,
  backend: string,
  model: string,
): string {
  const payload = JSON.stringify({
    backend,
    model,
    taskPrompt: taskPrompt?.trim() ?? "",
    signals,
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function buildTabRankPrompt(
  signals: readonly TabRankSignal[],
  taskPrompt?: string,
): string {
  const lines = signals.map(
    (signal) =>
      `- path=${signal.path} class=${signal.fileClass} estTokens=${signal.estTokens} ` +
      `focused=${signal.focused} idle=${signal.idle} reasons=${signal.reasons.join("|") || "none"}`,
  );
  const task =
    taskPrompt?.trim().length
      ? `Optional developer task: ${taskPrompt.trim()}`
      : "Optional developer task: (none — infer from focused/recent editor signals)";

  return [
    "You rank open editor tabs for a coding-agent task context pack (TokenForge).",
    "Prefer currently focused / recently useful source over lockfiles, media, generated dumps, and idle noise.",
    "Do NOT read file bodies — only the metadata below. Do not invent paths.",
    "Return JSON only:",
    `{"rankedPaths":["<exact path>", "..."],"note":"one short sentence"}`,
    `Return at most ${MAX_PACK_PATHS} paths, highest priority first.`,
    task,
    "",
    "Open tabs (metadata only):",
    ...lines,
  ].join("\n");
}

function parseRankedPaths(payload: unknown, allowed: ReadonlySet<string>): string[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }
  const ranked = (payload as { rankedPaths?: unknown }).rankedPaths;
  if (!Array.isArray(ranked)) {
    return [];
  }
  const out: string[] = [];
  for (const item of ranked) {
    if (typeof item !== "string") {
      continue;
    }
    if (!allowed.has(item) || out.includes(item)) {
      continue;
    }
    out.push(item);
    if (out.length >= MAX_PACK_PATHS) {
      break;
    }
  }
  return out;
}

async function defaultJudge(prompt: string): Promise<unknown> {
  const settings = readLlmSettings();
  const spec = parseLlmSpec(settings.llm);
  if (isExternalBackend(spec.backend) && !settings.allowExternal) {
    throw new Error(
      `Backend "${spec.backend}" sends data off this machine. Enable tokenforge.allowExternalLlm or use local ollama.`,
    );
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

/**
 * Task-aware pack: when Lane A enrichment is on, a bounded LLM ranks open-tab
 * metadata (no file bodies). Enrichment off or model failure → heuristic top-8.
 */
export async function buildTaskContextPack(
  session: ShieldSession,
  options: BuildTaskContextPackOptions = {},
): Promise<TaskContextPack> {
  const nowMs = options.nowMs ?? Date.now();
  const heuristic = buildHeuristicTaskContextPack(session, nowMs);
  const enrichmentEnabled =
    options.enrichmentEnabled ?? readLlmSettings().enrichmentEnabled;
  if (!enrichmentEnabled) {
    return heuristic;
  }

  const signals = collectTabRankSignals(session, nowMs);
  if (signals.length === 0) {
    return heuristic;
  }

  const settings = readLlmSettings();
  const spec = parseLlmSpec(settings.llm);
  const key = signalsCacheKey(signals, options.taskPrompt, spec.backend, spec.model);
  if (packCache?.key === key) {
    return packCache.pack;
  }
  if (inflight && inflightKey === key) {
    return inflight;
  }

  const tabs = session.listDisplayAtRisk(nowMs);
  const allowed = new Set(signals.map((signal) => signal.path));
  const judge = options.judge ?? defaultJudge;

  inflightKey = key;
  inflight = (async () => {
    try {
      const payload = await judge(buildTabRankPrompt(signals, options.taskPrompt));
      const ranked = parseRankedPaths(payload, allowed);
      if (ranked.length === 0) {
        return heuristic;
      }
      const note =
        typeof payload === "object" &&
        payload !== null &&
        typeof (payload as { note?: unknown }).note === "string"
          ? String((payload as { note: string }).note).trim()
          : "LLM-ranked task focus list — estimate only; not sent to any agent pipeline.";
      const pack = packFromPaths(
        ranked,
        tabs,
        note || "LLM-ranked task focus list — estimate only; not sent to any agent pipeline.",
        "llm",
      );
      packCache = { key, pack };
      return pack;
    } catch {
      return heuristic;
    } finally {
      inflight = undefined;
      inflightKey = undefined;
    }
  })();
  return inflight;
}

/** Sync peek for Overview: cached LLM pack when still valid, else heuristic. */
export function peekTaskContextPack(
  session: ShieldSession,
  nowMs: number = Date.now(),
): TaskContextPack {
  const enrichmentEnabled = readLlmSettings().enrichmentEnabled;
  if (!enrichmentEnabled || !packCache) {
    return buildHeuristicTaskContextPack(session, nowMs);
  }
  const settings = readLlmSettings();
  const spec = parseLlmSpec(settings.llm);
  const key = signalsCacheKey(
    collectTabRankSignals(session, nowMs),
    undefined,
    spec.backend,
    spec.model,
  );
  if (packCache.key === key) {
    return packCache.pack;
  }
  return buildHeuristicTaskContextPack(session, nowMs);
}
