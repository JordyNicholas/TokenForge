/**
 * Max files sent to an LLM enricher per hybrid scan.
 *
 * Re-exported from risk-core, which both owns and enforces it in
 * `selectEnrichmentCandidates`. Declaring a second `30` here is what made the
 * documented cap and the running cap two different numbers.
 */
export { DEFAULT_MAX_ENRICHMENT_CANDIDATES as MAX_ENRICHMENT_CANDIDATES } from "@tokenforge/risk-core";

/** Max bytes read from each candidate file for the model prompt. */
export const MAX_CANDIDATE_BYTES = 32 * 1024;

/** Max characters of each excerpt embedded in the LLM prompt (local models). */
export const MAX_LLM_EXCERPT_CHARS = 2_048;

/** Max characters per instruction-file digest in the Pass A map prompt. */
export const MAX_MAP_DIGEST_CHARS = 400;

/** Default Ollama per-batch timeout (local 7B on low-spec hardware can be very slow). */
export const DEFAULT_OLLAMA_TIMEOUT_MS = 900_000;

/** Minimum per-batch timeout accepted via CLI/env. */
export const MIN_OLLAMA_TIMEOUT_MS = 60_000;

/** Candidates per Ollama request — smaller batches finish sooner on weak GPUs/CPUs. */
export const OLLAMA_BATCH_SIZE = 2;

/**
 * Extra Pass A attempts after the first map call fails validation
 * (repair prompt with the previous output + reject reason).
 */
export const PASS_A_REPAIR_ATTEMPTS = 1;

/** How many times to retry a single Ollama request on transient network errors. */
export const OLLAMA_TRANSIENT_RETRIES = 3;

/** Base delay (ms) before the first Ollama transient retry; doubles each attempt. */
export const OLLAMA_RETRY_BASE_DELAY_MS = 500;

/** Short timeout for the Ollama /api/tags preflight reachability check. */
export const OLLAMA_PREFLIGHT_TIMEOUT_MS = 5_000;

export function resolveOllamaTimeoutMs(overrideMs?: number): number {
  if (overrideMs !== undefined && Number.isFinite(overrideMs) && overrideMs >= MIN_OLLAMA_TIMEOUT_MS) {
    return overrideMs;
  }

  const fromEnv = process.env.TOKENFORGE_OLLAMA_TIMEOUT_MS;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed >= MIN_OLLAMA_TIMEOUT_MS) {
      return parsed;
    }
  }

  return DEFAULT_OLLAMA_TIMEOUT_MS;
}

/** Parse `--llm-timeout` seconds from the CLI into milliseconds. */
export function parseLlmTimeoutSeconds(value: string | undefined): number | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Invalid --llm-timeout value "${value}". Use seconds, e.g. 900.`);
  }
  return Math.round(seconds * 1000);
}

/** Default Ollama base URL when `--llm-endpoint` is omitted. */
export const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434";

/** Default Codex CLI timeout for each bounded batch. */
export const DEFAULT_CODEX_TIMEOUT_MS = 120_000;

/** Minimum timeout accepted via CLI/env for Codex CLI. */
export const MIN_CODEX_TIMEOUT_MS = 10_000;

/** Authentication detection should fail quickly and never receive source excerpts. */
export const CODEX_STATUS_TIMEOUT_MS = 10_000;

/** Candidates sent to each non-interactive Codex run. */
export const CODEX_BATCH_SIZE = 4;

export function resolveCodexTimeoutMs(overrideMs?: number): number {
  if (overrideMs !== undefined && Number.isFinite(overrideMs) && overrideMs >= MIN_CODEX_TIMEOUT_MS) {
    return overrideMs;
  }

  const fromEnv = process.env.TOKENFORGE_CODEX_TIMEOUT_MS;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed >= MIN_CODEX_TIMEOUT_MS) {
      return parsed;
    }
  }

  return DEFAULT_CODEX_TIMEOUT_MS;
}

/**
 * Default Claude Code CLI timeout per batch. Higher than Codex's 120s because
 * a non-bare `claude -p` boots the full session (settings, skills, plugins)
 * before the first token.
 */
export const DEFAULT_CLAUDE_CODE_TIMEOUT_MS = 180_000;

/** Minimum timeout accepted via CLI/env for Claude Code. */
export const MIN_CLAUDE_CODE_TIMEOUT_MS = 10_000;

/** Candidates sent to each non-interactive Claude Code run. */
export const CLAUDE_CODE_BATCH_SIZE = 4;

/** Default Gemini CLI timeout for each bounded batch. */
export const DEFAULT_GEMINI_CLI_TIMEOUT_MS = 120_000;

/** Minimum timeout accepted via CLI/env for Gemini CLI. */
export const MIN_GEMINI_CLI_TIMEOUT_MS = 10_000;

/** Authentication detection should fail quickly and never receive source excerpts. */
export const GEMINI_CLI_STATUS_TIMEOUT_MS = 10_000;

/** Candidates sent to each non-interactive Gemini CLI run. */
export const GEMINI_CLI_BATCH_SIZE = 4;

export function resolveGeminiCliTimeoutMs(overrideMs?: number): number {
  if (
    overrideMs !== undefined &&
    Number.isFinite(overrideMs) &&
    overrideMs >= MIN_GEMINI_CLI_TIMEOUT_MS
  ) {
    return overrideMs;
  }

  const fromEnv = process.env.TOKENFORGE_GEMINI_CLI_TIMEOUT_MS;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed >= MIN_GEMINI_CLI_TIMEOUT_MS) {
      return parsed;
    }
  }

  return DEFAULT_GEMINI_CLI_TIMEOUT_MS;
}

/**
 * Default Cursor CLI timeout per batch. Matches Claude Code's budget because
 * `agent -p` boots a full agent session before the first token.
 */
export const DEFAULT_CURSOR_CLI_TIMEOUT_MS = 180_000;

/** Minimum timeout accepted via CLI/env for Cursor CLI. */
export const MIN_CURSOR_CLI_TIMEOUT_MS = 10_000;

/** Authentication detection should fail quickly and never receive source excerpts. */
export const CURSOR_CLI_STATUS_TIMEOUT_MS = 10_000;

/** Candidates sent to each non-interactive Cursor CLI run. */
export const CURSOR_CLI_BATCH_SIZE = 4;

export function resolveCursorCliTimeoutMs(overrideMs?: number): number {
  if (
    overrideMs !== undefined &&
    Number.isFinite(overrideMs) &&
    overrideMs >= MIN_CURSOR_CLI_TIMEOUT_MS
  ) {
    return overrideMs;
  }

  const fromEnv = process.env.TOKENFORGE_CURSOR_CLI_TIMEOUT_MS;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed >= MIN_CURSOR_CLI_TIMEOUT_MS) {
      return parsed;
    }
  }

  return DEFAULT_CURSOR_CLI_TIMEOUT_MS;
}

export function resolveClaudeCodeTimeoutMs(overrideMs?: number): number {
  if (
    overrideMs !== undefined &&
    Number.isFinite(overrideMs) &&
    overrideMs >= MIN_CLAUDE_CODE_TIMEOUT_MS
  ) {
    return overrideMs;
  }

  const fromEnv = process.env.TOKENFORGE_CLAUDE_CODE_TIMEOUT_MS;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed >= MIN_CLAUDE_CODE_TIMEOUT_MS) {
      return parsed;
    }
  }

  return DEFAULT_CLAUDE_CODE_TIMEOUT_MS;
}

/** Default Anthropic base URL when `--llm-endpoint` is omitted. */
export const DEFAULT_ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1";

/** Anthropic Messages API version header. */
export const ANTHROPIC_API_VERSION = "2023-06-01";

/** Anthropic Messages API requires an explicit max_tokens on every request. */
export const ANTHROPIC_MAX_OUTPUT_TOKENS = 4096;

/** Default Anthropic per-batch timeout (hosted API — fails fast on real problems). */
export const DEFAULT_ANTHROPIC_TIMEOUT_MS = 120_000;

/** Minimum per-batch timeout accepted via CLI/env for Anthropic. */
export const MIN_ANTHROPIC_TIMEOUT_MS = 10_000;

/** Candidates per Anthropic request — hosted API tolerates larger batches than local Ollama. */
export const ANTHROPIC_BATCH_SIZE = 4;

export function resolveAnthropicTimeoutMs(overrideMs?: number): number {
  if (overrideMs !== undefined && Number.isFinite(overrideMs) && overrideMs >= MIN_ANTHROPIC_TIMEOUT_MS) {
    return overrideMs;
  }

  const fromEnv = process.env.TOKENFORGE_ANTHROPIC_TIMEOUT_MS;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed >= MIN_ANTHROPIC_TIMEOUT_MS) {
      return parsed;
    }
  }

  return DEFAULT_ANTHROPIC_TIMEOUT_MS;
}
