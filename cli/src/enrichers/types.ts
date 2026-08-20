import type {
  FindingReason,
  LlmBackendId,
  TokenRiskFinding,
} from "@tokenforge/risk-core";

/** One repo path the enricher may inspect (bounded excerpt at the CLI edge). */
export type EnrichmentCandidate = {
  path: string;
  bytes: number;
  estTokens: number;
  excerpt: string;
};

export type LlmEnricherInput = {
  root: string;
  candidates: EnrichmentCandidate[];
  model: string;
  endpoint?: string;
  /** Per-batch request timeout in milliseconds. */
  timeoutMs?: number;
  /** Optional progress sink (CLI writes to stderr). */
  onProgress?: (message: string) => void;
  /** Explicit approval for adapters that send excerpts outside this machine. */
  externalDataConsent?: boolean;
};

export type LlmEnrichmentResult = {
  findings: TokenRiskFinding[];
  meta: {
    backend: LlmBackendId;
    model: string;
    endpoint?: string;
    durationMs: number;
    candidatesSent: number;
  };
};

/** Internal LLM JSON shape before mapping to Token Risk findings. */
export type LlmVerdict = "exclude" | "review" | "keep";

export type LlmStructuredFinding = {
  path: string;
  verdict: LlmVerdict;
  reason: FindingReason;
  confidence?: number;
  detail?: string;
  suggestion?: TokenRiskFinding["suggestion"];
};

export type LlmEnricher = {
  id: LlmBackendId;
  enrich(input: LlmEnricherInput): Promise<LlmEnrichmentResult>;
};

export type ParsedLlmSpec = {
  backend: LlmBackendId;
  model: string;
};
