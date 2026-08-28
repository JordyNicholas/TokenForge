import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimeError, UsageError } from "../errors";
import {
  CURSOR_CLI_BATCH_SIZE,
  CURSOR_CLI_STATUS_TIMEOUT_MS,
  resolveCursorCliTimeoutMs,
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

export type CursorCliCommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type CursorCliCommandOptions = {
  cwd: string;
  input?: string;
  timeoutMs: number;
};

export type CursorCliCommandRunner = (
  args: readonly string[],
  options: CursorCliCommandOptions,
) => Promise<CursorCliCommandResult>;

export function buildCursorCliEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return { ...source };
}

function appendBounded(current: string, chunk: Buffer | string): string {
  if (current.length >= MAX_PROCESS_OUTPUT_CHARS) {
    return current;
  }
  return `${current}${String(chunk)}`.slice(0, MAX_PROCESS_OUTPUT_CHARS);
}

export const runCursorCliCommand: CursorCliCommandRunner = (args, options) => {
  const command = process.env.TOKENFORGE_CURSOR_CLI_PATH?.trim() || "agent";

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: buildCursorCliEnvironment(),
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

function failureDetail(result: CursorCliCommandResult): string {
  return (result.stderr.trim() || result.stdout.trim()).slice(0, 500);
}

function looksUnauthenticated(text: string): boolean {
  return /not (signed in|authenticated|logged in)|sign ?in|\/login\b|authentication|invalid api key|CURSOR_API_KEY/i.test(
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
};

/**
 * Unwrap `agent -p --output-format json`.
 *
 * Cursor CLI has no `--json-schema` flag, so structured findings live in the
 * prose `result` string and are extracted with the shared JSON parser.
 */
export function extractCursorPayload(stdout: string): unknown {
  let envelope: ResultEnvelope;
  try {
    envelope = JSON.parse(stdout.trim()) as ResultEnvelope;
  } catch {
    throw new RuntimeError(
      "Cursor CLI returned output that is not the expected --output-format json envelope.",
    );
  }

  if (envelope.is_error === true || (envelope.subtype && envelope.subtype !== "success")) {
    const detail = typeof envelope.result === "string" ? envelope.result : "";
    if (looksUnauthenticated(detail)) {
      throw new RuntimeError(
        "Cursor CLI is not authenticated. Run `agent login` or set CURSOR_API_KEY, " +
          `then retry.${detail ? ` ${detail.slice(0, 300)}` : ""}`,
      );
    }
    throw new RuntimeError(
      `Cursor CLI reported a failed run (${envelope.subtype ?? "error"}).` +
        (detail ? ` ${detail.slice(0, 300)}` : ""),
    );
  }

  if (typeof envelope.result === "string" && envelope.result.trim().length > 0) {
    return extractJsonPayload(envelope.result);
  }
  throw new RuntimeError("Cursor CLI returned an empty result.");
}

function hasFindingsArray(value: unknown): value is { findings: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { findings?: unknown }).findings)
  );
}

/** Keep positional prompts under typical ARG_MAX while allowing stdin fallback. */
const MAX_POSITIONAL_PROMPT_CHARS = 120_000;

export type CursorCliInvocation = {
  args: readonly string[];
  input?: string;
};

function statusLooksAuthenticated(stdout: string): boolean {
  try {
    const payload = JSON.parse(stdout.trim()) as {
      status?: string;
      isAuthenticated?: boolean;
      authenticated?: boolean;
      loggedIn?: boolean;
      userInfo?: { email?: string };
      email?: string;
    };
    if (
      payload.isAuthenticated === true ||
      payload.authenticated === true ||
      payload.loggedIn === true ||
      payload.status === "authenticated"
    ) {
      return true;
    }
    const email = payload.userInfo?.email ?? payload.email;
    if (typeof email === "string" && email.length > 0) {
      return true;
    }
  } catch {
    // Fall back to exit-code-only checks below.
  }
  return /authenticated|logged in|email/i.test(stdout);
}

async function assertCursorCliReady(
  run: CursorCliCommandRunner,
  workspace: string,
): Promise<void> {
  let status: CursorCliCommandResult;
  try {
    status = await run(["status", "--format", "json"], {
      cwd: workspace,
      timeoutMs: CURSOR_CLI_STATUS_TIMEOUT_MS,
    });
  } catch (error) {
    if (isMissingExecutable(error)) {
      throw new RuntimeError(
        "Cursor CLI is not installed or is not available on PATH. Install it from cursor.com/install, then run `agent login`.",
      );
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Could not check Cursor CLI authentication. ${reason}`);
  }

  if (status.timedOut) {
    throw new RuntimeError("Timed out while checking Cursor CLI authentication.");
  }
  if (status.exitCode !== 0) {
    const detail = failureDetail(status);
    if (looksUnauthenticated(detail)) {
      throw new RuntimeError(
        `Cursor CLI is not authenticated. Run \`agent login\` or set CURSOR_API_KEY.${
          detail ? ` ${detail}` : ""
        }`,
      );
    }
    throw new RuntimeError(
      `Cursor CLI authentication check failed (exit ${status.exitCode ?? "unknown"}).${
        detail ? ` ${detail}` : ""
      }`,
    );
  }

  if (!statusLooksAuthenticated(status.stdout)) {
    const detail = failureDetail(status);
    if (looksUnauthenticated(detail)) {
      throw new RuntimeError(
        `Cursor CLI is not authenticated. Run \`agent login\` or set CURSOR_API_KEY.${
          detail ? ` ${detail}` : ""
        }`,
      );
    }
  }
}

function requestedModel(model: string): string | undefined {
  const trimmed = model.trim();
  return trimmed.length === 0 || trimmed === "default" || trimmed === "none"
    ? undefined
    : trimmed;
}

export function cursorCliArgs(
  model: string | undefined,
  workspace: string,
  prompt: string,
): CursorCliInvocation {
  const base = [
    "-p",
    "--output-format",
    "json",
    "--mode",
    "ask",
    "--trust",
    "--workspace",
    workspace,
    ...(model ? ["--model", model] : []),
  ] as const;

  if (prompt.length <= MAX_POSITIONAL_PROMPT_CHARS) {
    return { args: [...base, prompt] };
  }

  return { args: base, input: prompt };
}

/** Cursor CLI enricher using the user's Cursor login or CURSOR_API_KEY. */
export function createCursorCliEnricher(
  run: CursorCliCommandRunner = runCursorCliCommand,
): LlmEnricher {
  return {
    id: "cursor-cli",
    async enrich(input) {
      const started = Date.now();
      const model = requestedModel(input.model);
      const reportedModel = model ?? "default";
      const timeoutMs = resolveCursorCliTimeoutMs(input.timeoutMs);
      const progress = input.onProgress;

      if (input.endpoint?.trim()) {
        throw new UsageError(
          "--llm-endpoint is not supported by the Cursor CLI backend.",
        );
      }

      if (input.candidates.length === 0) {
        return {
          findings: [],
          meta: {
            backend: "cursor-cli",
            model: reportedModel,
            durationMs: 0,
            candidatesSent: 0,
          },
        };
      }

      progress?.(
        `Privacy warning: Cursor CLI enrichment will send ${input.candidates.length} bounded ` +
          "source-code excerpt(s) to Cursor's hosted models through the user's Cursor account; data may " +
          "leave this machine. TokenForge never sends the whole repository.",
      );
      if (!input.externalDataConsent) {
        throw new UsageError(
          "Cursor CLI enrichment requires confirmation. Review the privacy warning and rerun with --allow-external.",
        );
      }

      const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-cursor-cli-"));

      try {
        await assertCursorCliReady(run, temporaryRoot);

        const batches = chunkCandidates(input.candidates, CURSOR_CLI_BATCH_SIZE);
        const findings = [];

        for (let index = 0; index < batches.length; index += 1) {
          const batch = batches[index]!;
          progress?.(
            `Cursor CLI enricher: batch ${index + 1}/${batches.length} ` +
              `(${batch.length} file(s), timeout ${Math.round(timeoutMs / 1000)}s per batch)…`,
          );

          let result: CursorCliCommandResult;
          try {
            const invocation = cursorCliArgs(model, temporaryRoot, buildEnrichmentPrompt(batch, LARGE_CONTEXT_PROMPT));
            result = await run(invocation.args, {
              cwd: temporaryRoot,
              input: invocation.input,
              timeoutMs,
            });
          } catch (error) {
            if (isMissingExecutable(error)) {
              throw new RuntimeError(
                "Cursor CLI is not installed or is not available on PATH. Install it from cursor.com/install, then run `agent login`.",
              );
            }
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(`Could not start Cursor CLI. ${reason}`);
          }

          if (result.timedOut) {
            throw new RuntimeError(
              `Cursor CLI enrichment timed out after ${Math.round(timeoutMs / 1000)}s. ` +
                "Retry with a higher --llm-timeout (seconds) or scan a smaller folder.",
            );
          }
          if (result.exitCode !== 0) {
            const detail = failureDetail(result);
            if (looksUnauthenticated(detail)) {
              throw new RuntimeError(
                "Cursor CLI is not authenticated. Run `agent login` or set CURSOR_API_KEY, " +
                  `then retry.${detail ? ` ${detail}` : ""}`,
              );
            }
            throw new RuntimeError(
              `Cursor CLI enrichment failed (exit ${result.exitCode ?? "unknown"}).${
                detail ? ` ${detail}` : ""
              }`,
            );
          }

          try {
            const payload = extractCursorPayload(result.stdout);
            if (!hasFindingsArray(payload)) {
              throw new Error('response must contain a "findings" array');
            }
            const structured = parseStructuredFindings(payload, batch);
            findings.push(...mapStructuredFindings(structured, batch));
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(
              `Cursor CLI returned malformed structured output. ${reason}`,
            );
          }
        }

        progress?.(
          `Cursor CLI enricher: finished in ${Math.round((Date.now() - started) / 1000)}s ` +
            `(${findings.length} finding(s)).`,
        );

        return {
          findings,
          meta: {
            backend: "cursor-cli",
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

export const cursorCliEnricher = createCursorCliEnricher();
