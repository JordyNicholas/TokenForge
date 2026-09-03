import { parseLlmSpec } from "@tokenforge/enrichers";

/**
 * Parse a `tokenforge.llm` spec without throwing. The setting's default value is
 * the literal `"noop"`, which `parseLlmSpec` rejects (it only maps empty/unset
 * to no-op), so an unguarded call would crash the Overview/status bar for every
 * default user. Any unparseable value degrades to the no-op (no model) state.
 */
export function safeParseLlmSpec(llm: string | undefined): ReturnType<typeof parseLlmSpec> {
  const trimmed = (llm ?? "").trim();
  if (trimmed === "" || trimmed === "noop") {
    return { backend: "noop", model: "none" };
  }
  try {
    return parseLlmSpec(trimmed);
  } catch {
    return { backend: "noop", model: "none" };
  }
}

/** Outcome of the last Analyze rules run, surfaced in the Overview / status bar. */
export type EnrichRunStatus = {
  at: number;
  ok: boolean;
  findingCount: number;
  candidateCount: number;
  backend: string;
  model: string;
  error?: string;
};

/** First-class, at-a-glance view of Lane A (Extension → LLM) state. */
export type EnrichmentStatusView = {
  on: boolean;
  backend: string;
  model: string;
  /** false when enrichment is on but the backend is the no-op stub (no real model). */
  hasModel: boolean;
  headline: string;
  detail?: string;
};

/**
 * Pure description of enrichment state for the UI. Kept free of VS Code so it is
 * unit-testable: given the current settings + last run, produce the on/off +
 * backend/model headline and a one-line detail.
 */
export function describeEnrichmentStatus(
  settings: { enrichmentEnabled: boolean; llm: string },
  lastRun?: EnrichRunStatus,
): EnrichmentStatusView {
  const spec = safeParseLlmSpec(settings.llm);
  const hasModel = spec.backend !== "noop";
  const backendLabel = hasModel ? `${spec.backend}:${spec.model}` : spec.backend;

  if (!settings.enrichmentEnabled) {
    return {
      on: false,
      backend: spec.backend,
      model: spec.model,
      hasModel,
      headline: "AI enrichment: Off — Detect stays heuristic",
      detail: "Enable to let a local, opt-in model judge your rules and context.",
    };
  }

  const headline = hasModel
    ? `AI enrichment: On — ${backendLabel}`
    : "AI enrichment: On — no model set (using no-op)";
  const detail =
    describeLastRun(lastRun) ??
    (hasModel
      ? "Run Analyze rules to enrich instruction files (bounded candidate set)."
      : "Set tokenforge.llm to a model (e.g. ollama:qwen2.5-coder:3b) to get findings.");

  return { on: true, backend: spec.backend, model: spec.model, hasModel, headline, detail };
}

function describeLastRun(lastRun?: EnrichRunStatus): string | undefined {
  if (!lastRun) {
    return undefined;
  }
  if (!lastRun.ok) {
    return `Last run failed${lastRun.error ? `: ${lastRun.error}` : ""}`;
  }
  return `Last analyzed ${lastRun.candidateCount} file(s) → ${lastRun.findingCount} finding(s)`;
}

// --- Runtime store: last run + change notifications -------------------------

let lastRun: EnrichRunStatus | undefined;
const listeners = new Set<() => void>();

export function getLastEnrichRun(): EnrichRunStatus | undefined {
  return lastRun;
}

export function recordEnrichRun(status: EnrichRunStatus): void {
  lastRun = status;
  for (const listener of [...listeners]) {
    listener();
  }
}

export function onEnrichStatusChange(listener: () => void): { dispose(): void } {
  listeners.add(listener);
  return {
    dispose: () => {
      listeners.delete(listener);
    },
  };
}

/** Test-only reset of module state. */
export function __resetEnrichStatus(): void {
  lastRun = undefined;
  listeners.clear();
}
