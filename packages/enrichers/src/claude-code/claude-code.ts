import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimeError, UsageError } from "../errors";
import {
  SINGLE_PASS_BATCH_SIZE,
  resolveClaudeCodeTimeoutMs,
} from "../limits";
import { mapStructuredFindings } from "../parse";
import {
  buildEnrichmentPrompt,
  LARGE_CONTEXT_PROMPT,
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import type { EnrichmentCandidate, LlmEnricher } from "../types";

const MAX_PROCESS_OUTPUT_CHARS = 1_048_576;

/** Mirrors the Codex output schema; `--json-schema` enforces it CLI-side. */
const CLAUDE_CODE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          verdict: { enum: ["exclude", "review", "keep"] },
          reason: {
            enum: [
              "semantic_bloat",
              "redundant_instructions",
              "low_signal_config",
              "duplicate_logic",
              "redundant_config",
            ],
          },
          confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
          detail: { type: ["string", "null"] },
          suggestion: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                properties: {
                  kind: {
                    enum: [
                      "exclude_from_context",
                      "trim_instructions",
                      "dedupe_rules",
                      "add_ignore",
                      "review",
                      "consolidate_duplicates",
                    ],
                  },
                  summary: { type: "string" },
                },
                required: ["kind", "summary"],
                additionalProperties: false,
              },
            ],
          },
        },
        required: [
          "path",
          "verdict",
          "reason",
          "confidence",
          "detail",
          "suggestion",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["findings"],
  additionalProperties: false,
} as const;

export type ClaudeCodeCommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type ClaudeCodeCommandOptions = {
  cwd: string;
  input?: string;
  timeoutMs: number;
};

export type ClaudeCodeCommandRunner = (
  args: readonly string[],
  options: ClaudeCodeCommandOptions,
) => Promise<ClaudeCodeCommandResult>;

export function buildClaudeCodeEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env = { ...source };
  // This backend exists to use the CLI's subscription login. An inherited key
  // would silently move the run onto usage-based API billing instead — the same
  // guard the Codex backend applies to OPENAI_API_KEY.
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

function appendBounded(current: string, chunk: Buffer | string): string {
  if (current.length >= MAX_PROCESS_OUTPUT_CHARS) {
    return current;
  }
  return `${current}${String(chunk)}`.slice(0, MAX_PROCESS_OUTPUT_CHARS);
}

export const runClaudeCodeCommand: ClaudeCodeCommandRunner = (args, options) => {
  const command = process.env.TOKENFORGE_CLAUDE_CODE_PATH?.trim() || "claude";

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: buildClaudeCodeEnvironment(),
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendBounded(stderr, chunk);
    });
    child.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (exitCode) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, timedOut });
    });

    child.stdin.on("error", () => {
      // A process that exits before consuming stdin is reported by its exit code.
    });
    child.stdin.end(options.input);
  });
};

function isMissingExecutable(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function failureDetail(result: ClaudeCodeCommandResult): string {
  return (result.stderr.trim() || result.stdout.trim()).slice(0, 500);
}

/** Claude Code reports an unauthenticated run as prose, not as a distinct code. */
function looksUnauthenticated(text: string): boolean {
  return /\/login\b|not logged in|log ?in to|authentication_failed|invalid api key/i.test(
    text,
  );
}

function chunkCandidates(
  candidates: readonly EnrichmentCandidate[],
  size: number,
): EnrichmentCandidate[][] {
  const batches: EnrichmentCandidate[][] = [];
  for (let index = 0; index < candidates.length; index += size) {
    batches.push(candidates.slice(index, index + size));
  }
  return batches;
}

type ResultEnvelope = {
  subtype?: string;
  is_error?: boolean;
  result?: unknown;
  structured_output?: unknown;
};

/**
 * Unwrap `--output-format json`.
 *
 * `--json-schema` puts the validated object on `structured_output`. A CLI old
 * enough to ignore the schema returns prose on `result` instead, so that path
 * stays as a fallback rather than a hard failure.
 */
export function extractStructuredPayload(stdout: string): unknown {
  let envelope: ResultEnvelope;
  try {
    envelope = JSON.parse(stdout.trim()) as ResultEnvelope;
  } catch {
    throw new RuntimeError(
      "Claude Code CLI returned output that is not the expected --output-format json envelope.",
    );
  }

  if (envelope.is_error === true || (envelope.subtype && envelope.subtype !== "success")) {
    // An in-run failure (missing auth above all) exits 0 and reports itself here.
    const detail = typeof envelope.result === "string" ? envelope.result : "";
    if (looksUnauthenticated(detail)) {
      throw new RuntimeError(
        "Claude Code CLI is not authenticated. Run `claude` and sign in with `/login`, " +
          `then retry.${detail ? ` ${detail.slice(0, 300)}` : ""}`,
      );
    }
    throw new RuntimeError(
      `Claude Code CLI reported a failed run (${envelope.subtype ?? "error"}).` +
        (detail ? ` ${detail.slice(0, 300)}` : ""),
    );
  }

  if (envelope.structured_output !== undefined && envelope.structured_output !== null) {
    return envelope.structured_output;
  }
  if (typeof envelope.result === "string" && envelope.result.trim().length > 0) {
    return extractJsonPayload(envelope.result);
  }
  throw new RuntimeError("Claude Code CLI returned an empty result.");
}

function requestedModel(model: string): string | undefined {
  const trimmed = model.trim();
  return trimmed.length === 0 || trimmed === "default" || trimmed === "none"
    ? undefined
    : trimmed;
}

export function claudeCodeArgs(model: string | undefined): string[] {
  return [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(CLAUDE_CODE_OUTPUT_SCHEMA),
    // No --max-turns: the flag is in the docs but not in the CLI (v2.1.247).
    // The turn bound is structural instead — the excerpts are already in the
    // prompt and the tool surface below is deny-by-default, so there is nothing
    // for a second turn to do.
    // Deny anything not explicitly allowed. Notably NOT
    // --dangerously-skip-permissions, which would auto-approve every tool.
    "--permission-mode",
    "dontAsk",
    // Ignore any .mcp.json the session would otherwise pick up.
    "--strict-mcp-config",
    ...(model ? ["--model", model] : []),
  ];
}

/** Claude Code CLI enricher using the user's saved subscription login. */
export function createClaudeCodeEnricher(
  run: ClaudeCodeCommandRunner = runClaudeCodeCommand,
): LlmEnricher {
  return {
    id: "claude-code",
    async enrich(input) {
      const started = Date.now();
      const model = requestedModel(input.model);
      const reportedModel = model ?? "default";
      const timeoutMs = resolveClaudeCodeTimeoutMs(input.timeoutMs);
      const progress = input.onProgress;

      if (input.endpoint?.trim()) {
        throw new UsageError(
          "--llm-endpoint is not supported by the Claude Code CLI backend.",
        );
      }

      if (input.candidates.length === 0) {
        return {
          findings: [],
          meta: {
            backend: "claude-code",
            model: reportedModel,
            durationMs: 0,
            candidatesSent: 0,
          },
        };
      }

      progress?.(
        `Privacy warning: Claude Code enrichment will send ${input.candidates.length} bounded ` +
          "source-code excerpt(s) to Anthropic through the user's Claude Code session; data may " +
          "leave this machine. TokenForge never sends the whole repository.",
      );
      if (!input.externalDataConsent) {
        throw new UsageError(
          "Claude Code enrichment requires confirmation. Review the privacy warning and rerun with --allow-external.",
        );
      }

      // A `claude -p` run loads settings, hooks, MCP servers and CLAUDE.md from
      // its working directory with no trust prompt. Running from an empty
      // temporary directory keeps the *scanned* repository from configuring the
      // process that is analyzing it. --bare would also do this, but it skips
      // the subscription login this backend exists to use.
      const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-claude-code-"));

      try {
        const batches = chunkCandidates(input.candidates, SINGLE_PASS_BATCH_SIZE);
        const findings = [];

        for (let index = 0; index < batches.length; index += 1) {
          const batch = batches[index]!;
          progress?.(
            `Claude Code enricher: batch ${index + 1}/${batches.length} ` +
              `(${batch.length} file(s), timeout ${Math.round(timeoutMs / 1000)}s per batch)…`,
          );

          let result: ClaudeCodeCommandResult;
          try {
            result = await run(claudeCodeArgs(model), {
              cwd: temporaryRoot,
              input: buildEnrichmentPrompt(batch, LARGE_CONTEXT_PROMPT),
              timeoutMs,
            });
          } catch (error) {
            if (isMissingExecutable(error)) {
              throw new RuntimeError(
                "Claude Code CLI is not installed or is not available on PATH. " +
                  "Install @anthropic-ai/claude-code, then run `claude` and sign in.",
              );
            }
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(`Could not start Claude Code CLI. ${reason}`);
          }

          if (result.timedOut) {
            throw new RuntimeError(
              `Claude Code CLI enrichment timed out after ${Math.round(timeoutMs / 1000)}s. ` +
                "Retry with a higher --llm-timeout (seconds) or scan a smaller folder.",
            );
          }
          if (result.exitCode !== 0) {
            const detail = failureDetail(result);
            if (looksUnauthenticated(detail)) {
              throw new RuntimeError(
                "Claude Code CLI is not authenticated. Run `claude` and sign in with `/login`, " +
                  `then retry.${detail ? ` ${detail}` : ""}`,
              );
            }
            throw new RuntimeError(
              `Claude Code CLI enrichment failed (exit ${result.exitCode ?? "unknown"}).${
                detail ? ` ${detail}` : ""
              }`,
            );
          }

          const payload = extractStructuredPayload(result.stdout);
          try {
            const structured = parseStructuredFindings(payload, batch);
            findings.push(...mapStructuredFindings(structured, batch));
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(
              `Claude Code CLI returned malformed structured output. ${reason}`,
            );
          }
        }

        progress?.(
          `Claude Code enricher: finished in ${Math.round((Date.now() - started) / 1000)}s ` +
            `(${findings.length} finding(s)).`,
        );

        return {
          findings,
          meta: {
            backend: "claude-code",
            model: reportedModel,
            durationMs: Date.now() - started,
            candidatesSent: input.candidates.length,
          },
        };
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    },
  };
}

export const claudeCodeEnricher = createClaudeCodeEnricher();
