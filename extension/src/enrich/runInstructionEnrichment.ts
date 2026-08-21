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
};

/**
 * Opt-in hybrid enrich on instruction-path candidates only.
 * Live Context Guard scoring stays heuristic; this feeds last-scan layers.
 */
export async function runInstructionEnrichment(
  options: RunInstructionEnrichmentOptions,
): Promise<LlmEnrichmentResult> {
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

  const timeoutMs =
    settings.timeoutSeconds !== undefined
      ? parseLlmTimeoutSeconds(String(settings.timeoutSeconds))
      : undefined;

  return enricher.enrich({
    root: options.root,
    candidates,
    model: spec.model,
    endpoint: settings.endpoint,
    timeoutMs,
    onProgress: options.onProgress,
    externalDataConsent:
      options.externalDataConsent === true ||
      settings.allowExternal ||
      !isExternalBackend(spec.backend),
  });
}
