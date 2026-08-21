import {
  parseLlmAnalysisOverview,
  type LlmAnalysisOverview,
} from "@tokenforge/risk-core";
import {
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import { PASS_A_REPAIR_ATTEMPTS } from "../limits";
import type { EnrichmentCandidate, LlmStructuredFinding } from "../types";
import { groupCandidatesForJudge } from "./group";
import {
  evaluateRepoContextMap,
  type RepoContextMapEvaluation,
} from "./map";
import {
  buildJudgePrompt,
  buildMapPrompt,
  buildMapRepairPrompt,
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

export type MultiPassEnrichResult = {
  findings: LlmStructuredFinding[];
  analysisOverview?: LlmAnalysisOverview;
};

function formatPassAReject(
  evaluation: Extract<RepoContextMapEvaluation, { ok: false }>,
): string {
  return `${evaluation.reason}: ${evaluation.detail}`;
}

function tryParseMap(
  content: string,
  candidates: readonly EnrichmentCandidate[],
):
  | { ok: true; map: RepoContextMap }
  | { ok: false; detail: string; previousOutput: string } {
  let payload: unknown;
  try {
    payload = extractJsonPayload(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      detail: `not_json: ${message}`,
      previousOutput: content,
    };
  }

  const evaluation = evaluateRepoContextMap(payload, candidates);
  if (evaluation.ok) {
    return { ok: true, map: evaluation.map };
  }
  return {
    ok: false,
    detail: formatPassAReject(evaluation),
    previousOutput: content,
  };
}

/** Deterministic capsule when Pass C did not return a usable overview. */
export function buildFallbackAnalysisOverview(input: {
  mapAvailable: boolean;
  findingCount: number;
  candidateCount: number;
}): LlmAnalysisOverview {
  const caveats: string[] = [];
  if (!input.mapAvailable) {
    caveats.push(
      "Pass A context map was unavailable; candidates were judged in flat batches and Pass C reconcile was skipped.",
    );
  }
  const summary = input.mapAvailable
    ? `Hybrid LLM enrich reviewed ${input.candidateCount} candidate path(s) with a context map and produced ${input.findingCount} finding(s). Per-path verdicts remain the source of truth for Fix.`
    : `Hybrid LLM enrich reviewed ${input.candidateCount} candidate path(s) without a usable context map and produced ${input.findingCount} finding(s). Cross-file reconcile was skipped; per-path verdicts remain the source of truth for Fix.`;

  return parseLlmAnalysisOverview({
    summary,
    themes: input.findingCount > 0 ? ["hybrid enrich"] : ["no llm findings"],
    caveats,
  })!;
}

function overviewFromPayload(payload: unknown): LlmAnalysisOverview | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  return parseLlmAnalysisOverview(
    (payload as { analysisOverview?: unknown }).analysisOverview,
  );
}

async function runPassA(
  candidates: readonly EnrichmentCandidate[],
  callModel: CallModelFn,
  onProgress?: (message: string) => void,
): Promise<RepoContextMap | null> {
  onProgress?.("LLM enricher: Pass A (context map)…");

  let previousOutput = "";
  let lastDetail = "unknown: Pass A did not produce a usable map.";

  for (let attempt = 0; attempt <= PASS_A_REPAIR_ATTEMPTS; attempt += 1) {
    const isRepair = attempt > 0;
    try {
      const prompt = isRepair
        ? buildMapRepairPrompt(candidates, previousOutput, lastDetail)
        : buildMapPrompt(candidates);
      if (isRepair) {
        onProgress?.(
          `LLM enricher: Pass A repair ${attempt}/${PASS_A_REPAIR_ATTEMPTS} ` +
            `(${lastDetail})…`,
        );
      }
      const content = await callModel(prompt);
      const parsed = tryParseMap(content, candidates);
      if (parsed.ok) {
        if (isRepair) {
          onProgress?.("LLM enricher: Pass A repair succeeded.");
        }
        return parsed.map;
      }
      previousOutput = parsed.previousOutput;
      lastDetail = parsed.detail;
      onProgress?.(
        `LLM enricher: Pass A map rejected (${lastDetail}).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastDetail = `transport: ${message}`;
      previousOutput = previousOutput || `(transport error: ${message})`;
      onProgress?.(
        `LLM enricher: Pass A ${isRepair ? "repair " : ""}failed (${lastDetail}).`,
      );
    }
  }

  onProgress?.(
    `LLM enricher: Pass A unusable after repair — falling back to flat batching ` +
      `(Pass C skipped). Last error: ${lastDetail}`,
  );
  return null;
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
): Promise<{
  findings: LlmStructuredFinding[];
  analysisOverview?: LlmAnalysisOverview;
}> {
  if (findings.length === 0) {
    return { findings: [] };
  }

  onProgress?.("LLM enricher: Pass C (reconcile)…");
  try {
    const content = await callModel(buildReconcilePrompt(map, findings));
    const payload = extractJsonPayload(content);
    const reconciled = parseStructuredFindings(payload, candidates);
    const analysisOverview = overviewFromPayload(payload);
    return {
      findings: reconciled.length > 0 ? reconciled : [...findings],
      analysisOverview,
    };
  } catch {
    onProgress?.(
      "LLM enricher: Pass C failed — keeping Pass B findings.",
    );
    return { findings: [...findings] };
  }
}

/**
 * Map → judge → reconcile enrichment with injected model transport.
 * Pass A validates + one repair attempt before flat fallback; Pass C soft-fails;
 * Pass B transport errors propagate.
 */
export async function runMultiPassEnrich(
  options: MultiPassEnrichOptions,
): Promise<MultiPassEnrichResult> {
  const { candidates, callModel, batchSize, onProgress, skipReconcileLlm } =
    options;

  if (candidates.length === 0) {
    return { findings: [] };
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
  let analysisOverview: LlmAnalysisOverview | undefined;
  if (map && !skipReconcileLlm) {
    const reconciled = await runPassC(
      map,
      judged,
      candidates,
      callModel,
      onProgress,
    );
    findings = reconciled.findings;
    analysisOverview = reconciled.analysisOverview;
  }

  const reconciled = reconcileFindings(map, findings);
  return {
    findings: reconciled,
    analysisOverview:
      analysisOverview ??
      buildFallbackAnalysisOverview({
        mapAvailable: map !== null,
        findingCount: reconciled.length,
        candidateCount: candidates.length,
      }),
  };
}
