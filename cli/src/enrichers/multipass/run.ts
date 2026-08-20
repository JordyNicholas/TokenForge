import {
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import type { EnrichmentCandidate, LlmStructuredFinding } from "../types";
import { groupCandidatesForJudge } from "./group";
import { parseRepoContextMap } from "./map";
import {
  buildJudgePrompt,
  buildMapPrompt,
  buildReconcilePrompt,
} from "./prompts";
import { reconcileFindings } from "./reconcile";
import type { RepoContextMap } from "./types";

export type CallModelFn = (prompt: string) => Promise<string>;

export type MultiPassEnrichOptions = {
  candidates: readonly EnrichmentCandidate[];
  callModel: CallModelFn;
  batchSize: number;
  onProgress?: (message: string) => void;
  /** When true, skip the Pass C LLM call (still runs deterministic reconcile). */
  skipReconcileLlm?: boolean;
};

async function runPassA(
  candidates: readonly EnrichmentCandidate[],
  callModel: CallModelFn,
  onProgress?: (message: string) => void,
): Promise<RepoContextMap | null> {
  onProgress?.("LLM enricher: Pass A (context map)…");
  try {
    const content = await callModel(buildMapPrompt(candidates));
    const payload = extractJsonPayload(content);
    const map = parseRepoContextMap(payload, candidates);
    if (!map) {
      onProgress?.(
        "LLM enricher: Pass A map unusable — falling back to flat batching.",
      );
    }
    return map;
  } catch {
    onProgress?.(
      "LLM enricher: Pass A failed — falling back to flat batching.",
    );
    return null;
  }
}

async function runPassB(
  candidates: readonly EnrichmentCandidate[],
  map: RepoContextMap | null,
  callModel: CallModelFn,
  batchSize: number,
  onProgress?: (message: string) => void,
): Promise<LlmStructuredFinding[]> {
  const batches = groupCandidatesForJudge(candidates, map, batchSize);
  const findings: LlmStructuredFinding[] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index]!;
    onProgress?.(
      `LLM enricher: Pass B batch ${index + 1}/${batches.length} ` +
        `(${batch.length} file(s))…`,
    );
    const content = await callModel(buildJudgePrompt(batch, map));
    const payload = extractJsonPayload(content);
    findings.push(...parseStructuredFindings(payload, batch));
  }

  return findings;
}

async function runPassC(
  map: RepoContextMap,
  findings: readonly LlmStructuredFinding[],
  candidates: readonly EnrichmentCandidate[],
  callModel: CallModelFn,
  onProgress?: (message: string) => void,
): Promise<LlmStructuredFinding[]> {
  if (findings.length === 0) {
    return [];
  }

  onProgress?.("LLM enricher: Pass C (reconcile)…");
  try {
    const content = await callModel(buildReconcilePrompt(map, findings));
    const payload = extractJsonPayload(content);
    const reconciled = parseStructuredFindings(payload, candidates);
    // If the model returns nothing usable, keep Pass B findings.
    return reconciled.length > 0 ? reconciled : [...findings];
  } catch {
    onProgress?.(
      "LLM enricher: Pass C failed — keeping Pass B findings.",
    );
    return [...findings];
  }
}

/**
 * Map → judge → reconcile enrichment with injected model transport.
 * Pass A / Pass C failures fall back; Pass B transport errors propagate.
 */
export async function runMultiPassEnrich(
  options: MultiPassEnrichOptions,
): Promise<LlmStructuredFinding[]> {
  const { candidates, callModel, batchSize, onProgress, skipReconcileLlm } =
    options;

  if (candidates.length === 0) {
    return [];
  }

  const map = await runPassA(candidates, callModel, onProgress);
  const judged = await runPassB(
    candidates,
    map,
    callModel,
    batchSize,
    onProgress,
  );

  let findings = judged;
  if (map && !skipReconcileLlm) {
    findings = await runPassC(
      map,
      judged,
      candidates,
      callModel,
      onProgress,
    );
  }

  return reconcileFindings(map, findings);
}
