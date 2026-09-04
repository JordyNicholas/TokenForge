import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  MAX_CANDIDATE_BYTES,
  getEnricher,
  parseLlmSpec,
  parseLlmTimeoutSeconds,
  type EnrichmentCandidate,
  type LlmEnrichmentResult,
} from "@tokenforge/enrichers";
import type { RiskAssessment } from "@tokenforge/risk-core";
import {
  bucketFindingsByPath,
  hashContent,
  loadEnrichCache,
  partitionByCache,
  saveEnrichCache,
} from "./enrichCache";
import { isExternalBackend, readLlmSettings } from "./settings";

async function loadExcerpt(
  root: string,
  assessment: RiskAssessment,
): Promise<EnrichmentCandidate> {
  let excerpt = "";
  try {
    const raw = await readFile(join(root, assessment.path));
    excerpt = raw.subarray(0, MAX_CANDIDATE_BYTES).toString("utf8");
  } catch {
    excerpt = "";
  }
  return {
    path: assessment.path,
    bytes: assessment.bytes,
    estTokens: assessment.estTokens,
    excerpt,
  };
}

export type RunInstructionEnrichmentOptions = {
  root: string;
  candidates: readonly RiskAssessment[];
  onProgress?: (message: string) => void;
  /** When true, skip the interactive consent gate (tests). */
  externalDataConsent?: boolean;
  /**
   * Skip enrich-cache hits and send every candidate to the model.
   * Used by Analyze rules → Force re-analyze.
   */
  bypassCache?: boolean;
};

/** Extension-facing outcome; `fullCacheHit` is not written into last-scan meta. */
export type InstructionEnrichmentOutcome = LlmEnrichmentResult & {
  /** True when every candidate was served from enrich-cache (no model call). */
  fullCacheHit: boolean;
  cacheHitCount: number;
};

/**
 * Opt-in hybrid enrich on instruction-path candidates only.
 * Live Context Guard scoring stays heuristic; this feeds last-scan layers.
 */
export async function runInstructionEnrichment(
  options: RunInstructionEnrichmentOptions,
): Promise<InstructionEnrichmentOutcome> {
  const settings = readLlmSettings();
  if (!settings.enrichmentEnabled) {
    throw new Error(
      "LLM enrichment is off. Enable tokenforge.llmEnrichment (workspace) to run.",
    );
  }

  const spec = parseLlmSpec(settings.llm);
  if (isExternalBackend(spec.backend) && !settings.allowExternal) {
    if (!options.externalDataConsent) {
      throw new Error(
        `Backend "${spec.backend}" sends excerpts off this machine. Enable tokenforge.allowExternalLlm or cancel.`,
      );
    }
  }

  const enricher = getEnricher(spec.backend);
  const candidates = await Promise.all(
    options.candidates.map((assessment) => loadExcerpt(options.root, assessment)),
  );
  const hashed = candidates.map((candidate) => ({
    candidate,
    hash: hashContent(candidate.excerpt),
  }));

  // Content-hash cache: only files whose excerpt changed (per backend+model) are
  // sent to the model, so repeat Analyze / continuousAnalyze stays cost-bounded.
  // Force re-analyze (`bypassCache`) treats every path as stale.
  const cache = await loadEnrichCache(options.root, spec.backend, spec.model);
  const partitioned = options.bypassCache
    ? {
        hits: [] as string[],
        stale: hashed.map((entry) => entry.candidate.path),
      }
    : partitionByCache(
        hashed.map((entry) => ({ path: entry.candidate.path, hash: entry.hash })),
        cache,
      );
  const { hits, stale } = partitioned;
  const hitFindings = hits.flatMap((path) => cache.entries[path]?.findings ?? []);

  if (stale.length === 0) {
    options.onProgress?.(`cache hit — ${hits.length} unchanged file(s), no model call`);
    return {
      findings: hitFindings,
      meta: {
        backend: spec.backend,
        model: spec.model,
        endpoint: settings.endpoint,
        durationMs: 0,
        candidatesSent: 0,
      },
      fullCacheHit: true,
      cacheHitCount: hits.length,
    };
  }

  const staleSet = new Set(stale);
  const staleCandidates = hashed
    .filter((entry) => staleSet.has(entry.candidate.path))
    .map((entry) => entry.candidate);

  const timeoutMs =
    settings.timeoutSeconds !== undefined
      ? parseLlmTimeoutSeconds(String(settings.timeoutSeconds))
      : undefined;

  if (options.bypassCache) {
    options.onProgress?.(
      `force re-analyze — ${staleCandidates.length} file(s), bypassing cache`,
    );
  }

  const result = await enricher.enrich({
    root: options.root,
    candidates: staleCandidates,
    model: spec.model,
    endpoint: settings.endpoint,
    timeoutMs,
    onProgress: options.onProgress,
    externalDataConsent:
      options.externalDataConsent === true ||
      settings.allowExternal ||
      !isExternalBackend(spec.backend),
  });

  const freshByPath = bucketFindingsByPath(result.findings);
  for (const { candidate, hash } of hashed) {
    if (staleSet.has(candidate.path)) {
      cache.entries[candidate.path] = {
        hash,
        findings: freshByPath.get(candidate.path) ?? [],
      };
    }
  }
  await saveEnrichCache(options.root, cache);

  return {
    findings: [...result.findings, ...hitFindings],
    meta: result.meta,
    fullCacheHit: false,
    cacheHitCount: hits.length,
  };
}
