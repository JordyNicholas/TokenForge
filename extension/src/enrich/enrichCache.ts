import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TokenRiskFinding } from "@tokenforge/risk-core";

const CACHE_VERSION = 1;
const CACHE_REL_PATH = ".tokenforge/enrich-cache.json";

export type EnrichCacheEntry = {
  /** sha256 of the exact excerpt sent to the model. */
  hash: string;
  findings: TokenRiskFinding[];
};

export type EnrichCache = {
  version: number;
  backend: string;
  model: string;
  entries: Record<string, EnrichCacheEntry>;
};

/** sha256 of the content actually sent to the model — the cache key input. */
export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function emptyCache(backend: string, model: string): EnrichCache {
  return { version: CACHE_VERSION, backend, model, entries: {} };
}

/**
 * Split candidates into cache **hits** (unchanged content, already analyzed by
 * the same backend+model) and **stale** (need a model call). This is what makes
 * repeat Analyze / continuousAnalyze cost-bounded: only changed files are sent.
 */
export function partitionByCache(
  candidates: readonly { path: string; hash: string }[],
  cache: EnrichCache,
): { hits: string[]; stale: string[] } {
  const hits: string[] = [];
  const stale: string[] = [];
  for (const candidate of candidates) {
    const entry = cache.entries[candidate.path];
    if (entry && entry.hash === candidate.hash) {
      hits.push(candidate.path);
    } else {
      stale.push(candidate.path);
    }
  }
  return { hits, stale };
}

/** Bucket a flat finding list by its `path` so per-file entries can be cached. */
export function bucketFindingsByPath(
  findings: readonly TokenRiskFinding[],
): Map<string, TokenRiskFinding[]> {
  const byPath = new Map<string, TokenRiskFinding[]>();
  for (const finding of findings) {
    const list = byPath.get(finding.path) ?? [];
    list.push(finding);
    byPath.set(finding.path, list);
  }
  return byPath;
}

/**
 * Load the on-disk cache. A different backend/model (or version/shape) discards
 * it: findings are model-specific, so reusing them across models would be wrong.
 */
export async function loadEnrichCache(
  root: string,
  backend: string,
  model: string,
): Promise<EnrichCache> {
  try {
    const raw = await readFile(join(root, CACHE_REL_PATH), "utf8");
    const parsed = JSON.parse(raw) as Partial<EnrichCache>;
    if (
      parsed.version !== CACHE_VERSION ||
      parsed.backend !== backend ||
      parsed.model !== model ||
      typeof parsed.entries !== "object" ||
      parsed.entries === null
    ) {
      return emptyCache(backend, model);
    }
    return {
      version: CACHE_VERSION,
      backend,
      model,
      entries: parsed.entries as Record<string, EnrichCacheEntry>,
    };
  } catch {
    return emptyCache(backend, model);
  }
}

export async function saveEnrichCache(root: string, cache: EnrichCache): Promise<void> {
  const file = join(root, CACHE_REL_PATH);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}
