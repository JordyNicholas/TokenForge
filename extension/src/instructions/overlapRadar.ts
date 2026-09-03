import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  completeJson,
  MAX_LLM_EXCERPT_CHARS,
  parseLlmSpec,
  parseLlmTimeoutSeconds,
} from "@tokenforge/enrichers";
import { isInstructionPath } from "@tokenforge/risk-core";
import { isExternalBackend, readLlmSettings } from "../enrich/settings";
import type { TrackedTab } from "../tabs/types";

export type OverlapHint = {
  path: string;
  overlapsWith: string;
  note: string;
  source: "heuristic" | "llm";
};

export type JsonJudgeFn = (prompt: string) => Promise<unknown>;

export type ResolveOverlapOptions = {
  root: string;
  tabs: readonly TrackedTab[];
  instructionPaths: readonly string[];
  /** Injected JSON judge (tests). */
  judge?: JsonJudgeFn;
  enrichmentEnabled?: boolean;
};

const MAX_OVERLAP_FILES = 12;
const MAX_OVERLAP_HINTS = 8;

type CacheEntry = { key: string; hints: OverlapHint[] };
let overlapCache: CacheEntry | undefined;
let inflight: Promise<OverlapHint[]> | undefined;
let inflightKey: string | undefined;

/** Test seam. */
export function clearOverlapRadarCache(): void {
  overlapCache = undefined;
  inflight = undefined;
  inflightKey = undefined;
}

/** Heuristic overlap: instruction paths that share basename with open tabs. */
export function detectInstructionOverlap(
  tabs: readonly TrackedTab[],
  instructionPaths: readonly string[],
): OverlapHint[] {
  const hints: OverlapHint[] = [];
  const tabPaths = new Set(tabs.map((t) => t.path));

  for (const instr of instructionPaths) {
    if (!isInstructionPath(instr)) {
      continue;
    }
    const base = instr.split(/[/\\]/).pop() ?? instr;
    for (const tabPath of tabPaths) {
      if (tabPath === instr) {
        continue;
      }
      if (tabPath.endsWith(base)) {
        hints.push({
          path: instr,
          overlapsWith: tabPath,
          note: "Rule file and open tab share naming — review for redundant agent context.",
          source: "heuristic",
        });
      }
    }
  }

  return hints.slice(0, MAX_OVERLAP_HINTS);
}

export function buildOverlapPrompt(
  files: readonly { path: string; excerpt: string }[],
): string {
  const blocks = files.map(
    (file) => `### ${file.path}\n\`\`\`\n${file.excerpt}\n\`\`\``,
  );
  return [
    "You compare AI-agent instruction files for TokenForge overlap radar.",
    "Find SEMANTIC overlap: the same guidance restated in different wording (e.g. both say ignore tests).",
    "Do NOT report overlap only because two files share a basename or sit in similar folders.",
    "Do not invent paths. Advisory only — do not rewrite the files.",
    "Return JSON only:",
    `{"overlaps":[{"path":"<file A>","overlapsWith":"<file B>","note":"short reason"}]}`,
    `At most ${MAX_OVERLAP_HINTS} pairs.`,
    "",
    "Instruction files:",
    blocks.join("\n\n"),
  ].join("\n");
}

function parseOverlaps(
  payload: unknown,
  allowed: ReadonlySet<string>,
): OverlapHint[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }
  const raw = (payload as { overlaps?: unknown }).overlaps;
  if (!Array.isArray(raw)) {
    return [];
  }
  const hints: OverlapHint[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const path = (item as { path?: unknown }).path;
    const overlapsWith = (item as { overlapsWith?: unknown }).overlapsWith;
    const note = (item as { note?: unknown }).note;
    if (typeof path !== "string" || typeof overlapsWith !== "string") {
      continue;
    }
    if (!allowed.has(path) || !allowed.has(overlapsWith) || path === overlapsWith) {
      continue;
    }
    const key = [path, overlapsWith].sort().join("\0");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    hints.push({
      path,
      overlapsWith,
      note:
        typeof note === "string" && note.trim().length > 0
          ? note.trim()
          : "Redundant guidance across instruction files.",
      source: "llm",
    });
    if (hints.length >= MAX_OVERLAP_HINTS) {
      break;
    }
  }
  return hints;
}

async function loadExcerpts(
  root: string,
  instructionPaths: readonly string[],
): Promise<{ path: string; excerpt: string }[]> {
  const unique: string[] = [];
  for (const path of instructionPaths) {
    if (!isInstructionPath(path) || unique.includes(path)) {
      continue;
    }
    unique.push(path);
    if (unique.length >= MAX_OVERLAP_FILES) {
      break;
    }
  }

  const files: { path: string; excerpt: string }[] = [];
  for (const path of unique) {
    try {
      const raw = await readFile(join(root, path), "utf8");
      files.push({
        path,
        excerpt: raw.slice(0, MAX_LLM_EXCERPT_CHARS),
      });
    } catch {
      /* skip unreadable */
    }
  }
  return files;
}

function cacheKey(files: readonly { path: string; excerpt: string }[], spec: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ spec, files }), "utf8")
    .digest("hex");
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
 * Semantic overlap across instruction files when Lane A enrichment is on.
 * Enrichment off or model failure → basename heuristic.
 */
export async function resolveInstructionOverlap(
  options: ResolveOverlapOptions,
): Promise<OverlapHint[]> {
  const heuristic = detectInstructionOverlap(options.tabs, options.instructionPaths);
  const enrichmentEnabled =
    options.enrichmentEnabled ?? readLlmSettings().enrichmentEnabled;
  if (!enrichmentEnabled) {
    return heuristic;
  }

  const files = await loadExcerpts(options.root, options.instructionPaths);
  if (files.length < 2) {
    return [];
  }

  const settings = readLlmSettings();
  const spec = parseLlmSpec(settings.llm);
  const key = cacheKey(files, `${spec.backend}:${spec.model}`);
  if (overlapCache?.key === key) {
    return overlapCache.hints;
  }
  if (inflight && inflightKey === key) {
    return inflight;
  }

  const allowed = new Set(files.map((file) => file.path));
  const judge = options.judge ?? defaultJudge;
  inflightKey = key;
  inflight = (async () => {
    try {
      const payload = await judge(buildOverlapPrompt(files));
      const hints = parseOverlaps(payload, allowed);
      overlapCache = { key, hints };
      return hints;
    } catch {
      return heuristic;
    } finally {
      inflight = undefined;
      inflightKey = undefined;
    }
  })();
  return inflight;
}

/** Sync peek for Overview: cached LLM hints or heuristic. */
export function peekInstructionOverlap(
  tabs: readonly TrackedTab[],
  instructionPaths: readonly string[],
): OverlapHint[] {
  if (overlapCache && readLlmSettings().enrichmentEnabled) {
    return overlapCache.hints;
  }
  return detectInstructionOverlap(tabs, instructionPaths);
}
