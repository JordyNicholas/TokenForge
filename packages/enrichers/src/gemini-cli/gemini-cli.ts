import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimeError, UsageError } from "../errors";
import {
  GEMINI_CLI_BATCH_SIZE,
  GEMINI_CLI_STATUS_TIMEOUT_MS,
  resolveGeminiCliTimeoutMs,
} from "../limits";
import { mapStructuredFindings } from "../parse";
import {
  buildEnrichmentPrompt,
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import type { EnrichmentCandidate, LlmEnricher } from "../types";

const MAX_PROCESS_OUTPUT_CHARS = 1_048_576;

export type GeminiCliCommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type GeminiCliCommandOptions = {
  cwd: string;
  input?: string;
  timeoutMs: number;
};

export type GeminiCliCommandRunner = (
  args: readonly string[],
  options: GeminiCliCommandOptions,
) => Promise<GeminiCliCommandResult>;

export function buildGeminiCliEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env = { ...source };
  // This backend exists to use the CLI's saved Google login. An inherited key
  // would silently move the run onto usage-based API billing instead.
  delete env.GEMINI_API_KEY;
  delete env.GOOGLE_API_KEY;
  return env;
}

function appendBounded(current: string, chunk: Buffer | string): string {
  if (current.length >= MAX_PROCESS_OUTPUT_CHARS) {
    return current;
  }
  return `${current}${String(chunk)}`.slice(0, MAX_PROCESS_OUTPUT_CHARS);
}

export const runGeminiCliCommand: GeminiCliCommandRunner = (args, options) => {
  const command = process.env.TOKENFORGE_GEMINI_CLI_PATH?.trim() || "gemini";

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: buildGeminiCliEnvironment(),
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

function failureDetail(result: GeminiCliCommandResult): string {
  return (result.stderr.trim() || result.stdout.trim()).slice(0, 500);
}

function looksUnauthenticated(text: string): boolean {
  return /not (signed in|authenticated|logged in)|sign ?in|\/login\b|authentication|invalid api key|oauth/i.test(
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

type GeminiEnvelope = {
  response?: string;
  error?: { message?: string };
};

/**
 * Unwrap `--output-format json`.
 *
 * The model's structured answer lives in `response` as prose that may contain
 * a fenced JSON block; `extractJsonPayload` handles that shape.
 */
export function extractGeminiPayload(stdout: string): unknown {
  let envelope: GeminiEnvelope;
  try {
    envelope = JSON.parse(stdout.trim()) as GeminiEnvelope;
  } catch {
    throw new RuntimeError(
      "Gemini CLI returned output that is not the expected --output-format json envelope.",
    );
  }

  if (envelope.error) {
    const detail = envelope.error.message?.trim() ?? "";
    if (looksUnauthenticated(detail)) {
      throw new RuntimeError(
        "Gemini CLI is not authenticated. Run `gemini` and sign in with Google, " +
          `then retry.${detail ? ` ${detail.slice(0, 300)}` : ""}`,
      );
    }
    throw new RuntimeError(
      `Gemini CLI reported a failed run.${detail ? ` ${detail.slice(0, 300)}` : ""}`,
    );
  }

  if (typeof envelope.response !== "string" || envelope.response.trim().length === 0) {
    throw new RuntimeError("Gemini CLI returned an empty result.");
  }

  return extractJsonPayload(envelope.response);
}

function hasFindingsArray(value: unknown): value is { findings: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { findings?: unknown }).findings)
  );
}

async function assertGeminiCliReady(
  run: GeminiCliCommandRunner,
  cwd: string,
): Promise<void> {
  let status: GeminiCliCommandResult;
  try {
    status = await run(geminiCliArgs(undefined), {
      cwd,
      input: "ok",
      timeoutMs: GEMINI_CLI_STATUS_TIMEOUT_MS,
    });
  } catch (error) {
    if (isMissingExecutable(error)) {
      throw new RuntimeError(
        "Gemini CLI is not installed or is not available on PATH. Install @google/gemini-cli, then sign in.",
      );
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Could not check Gemini CLI authentication. ${reason}`);
  }

  if (status.timedOut) {
    throw new RuntimeError("Timed out while checking Gemini CLI authentication.");
  }
  if (status.exitCode !== 0) {
    const detail = failureDetail(status);
    if (looksUnauthenticated(detail)) {
      throw new RuntimeError(
        `Gemini CLI is not authenticated. Run \`gemini\` and sign in with Google.${
          detail ? ` ${detail}` : ""
        }`,
      );
    }
    throw new RuntimeError(
      `Gemini CLI authentication check failed (exit ${status.exitCode ?? "unknown"}).${
        detail ? ` ${detail}` : ""
      }`,
    );
  }

  try {
    extractGeminiPayload(status.stdout);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (looksUnauthenticated(reason)) {
      throw new RuntimeError(
        `Gemini CLI is not authenticated. Run \`gemini\` and sign in with Google. ${reason}`,
      );
    }
    throw new RuntimeError(`Gemini CLI authentication check returned invalid output. ${reason}`);
  }
}

function requestedModel(model: string): string | undefined {
  const trimmed = model.trim();
  return trimmed.length === 0 || trimmed === "default" || trimmed === "none"
    ? undefined
    : trimmed;
}

export function geminiCliArgs(model: string | undefined): string[] {
  return [
    "--output-format",
    "json",
    "--approval-mode",
    "plan",
    ...(model ? ["--model", model] : []),
  ];
}

/** Gemini CLI enricher using the user's saved Google authentication. */
export function createGeminiCliEnricher(
  run: GeminiCliCommandRunner = runGeminiCliCommand,
): LlmEnricher {
  return {
    id: "gemini-cli",
    async enrich(input) {
      const started = Date.now();
      const model = requestedModel(input.model);
      const reportedModel = model ?? "default";
      const timeoutMs = resolveGeminiCliTimeoutMs(input.timeoutMs);
      const progress = input.onProgress;

      if (input.endpoint?.trim()) {
        throw new UsageError(
          "--llm-endpoint is not supported by the Gemini CLI backend.",
        );
      }

      if (input.candidates.length === 0) {
        return {
          findings: [],
          meta: {
            backend: "gemini-cli",
            model: reportedModel,
            durationMs: 0,
            candidatesSent: 0,
          },
        };
      }

      progress?.(
        `Privacy warning: Gemini CLI enrichment will send ${input.candidates.length} bounded ` +
          "source-code excerpt(s) to Google through the user's Gemini CLI session; data may " +
          "leave this machine. TokenForge never sends the whole repository.",
      );
      if (!input.externalDataConsent) {
        throw new UsageError(
          "Gemini CLI enrichment requires confirmation. Review the privacy warning and rerun with --allow-external.",
        );
      }

      const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-gemini-cli-"));

      try {
        await assertGeminiCliReady(run, temporaryRoot);

        const batches = chunkCandidates(input.candidates, GEMINI_CLI_BATCH_SIZE);
        const findings = [];

        for (let index = 0; index < batches.length; index += 1) {
          const batch = batches[index]!;
          progress?.(
            `Gemini CLI enricher: batch ${index + 1}/${batches.length} ` +
              `(${batch.length} file(s), timeout ${Math.round(timeoutMs / 1000)}s per batch)…`,
          );

          let result: GeminiCliCommandResult;
          try {
            result = await run(geminiCliArgs(model), {
              cwd: temporaryRoot,
              input: buildEnrichmentPrompt(batch),
              timeoutMs,
            });
          } catch (error) {
            if (isMissingExecutable(error)) {
              throw new RuntimeError(
                "Gemini CLI is not installed or is not available on PATH. Install @google/gemini-cli, then sign in.",
              );
            }
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(`Could not start Gemini CLI. ${reason}`);
          }

          if (result.timedOut) {
            throw new RuntimeError(
              `Gemini CLI enrichment timed out after ${Math.round(timeoutMs / 1000)}s. ` +
                "Retry with a higher --llm-timeout (seconds) or scan a smaller folder.",
            );
          }
          if (result.exitCode !== 0) {
            const detail = failureDetail(result);
            if (looksUnauthenticated(detail)) {
              throw new RuntimeError(
                "Gemini CLI is not authenticated. Run `gemini` and sign in with Google, " +
                  `then retry.${detail ? ` ${detail}` : ""}`,
              );
            }
            throw new RuntimeError(
              `Gemini CLI enrichment failed (exit ${result.exitCode ?? "unknown"}).${
                detail ? ` ${detail}` : ""
              }`,
            );
          }

          try {
            const payload = extractGeminiPayload(result.stdout);
            if (!hasFindingsArray(payload)) {
              throw new Error('response must contain a "findings" array');
            }
            const structured = parseStructuredFindings(payload, batch);
            findings.push(...mapStructuredFindings(structured, batch));
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(
              `Gemini CLI returned malformed structured output. ${reason}`,
            );
          }
        }

        progress?.(
          `Gemini CLI enricher: finished in ${Math.round((Date.now() - started) / 1000)}s ` +
            `(${findings.length} finding(s)).`,
        );

        return {
          findings,
          meta: {
            backend: "gemini-cli",
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

export const geminiCliEnricher = createGeminiCliEnricher();
