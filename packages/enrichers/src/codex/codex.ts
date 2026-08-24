import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimeError, UsageError } from "../errors";
import {
  CODEX_BATCH_SIZE,
  CODEX_STATUS_TIMEOUT_MS,
  resolveCodexTimeoutMs,
} from "../limits";
import { mapStructuredFindings } from "../parse";
import {
  buildEnrichmentPrompt,
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import type { EnrichmentCandidate, LlmEnricher } from "../types";

const MAX_PROCESS_OUTPUT_CHARS = 1_048_576;

const CODEX_OUTPUT_SCHEMA = {
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

export type CodexCommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type CodexCommandOptions = {
  cwd: string;
  input?: string;
  timeoutMs: number;
};

export type CodexCommandRunner = (
  args: readonly string[],
  options: CodexCommandOptions,
) => Promise<CodexCommandResult>;

export function buildCodexEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env = { ...source };
  // The Codex backend intentionally uses the saved CLI login. Do not let an
  // inherited API key silently switch this invocation to usage-based billing.
  delete env.CODEX_API_KEY;
  delete env.OPENAI_API_KEY;
  return env;
}

function appendBounded(current: string, chunk: Buffer | string): string {
  if (current.length >= MAX_PROCESS_OUTPUT_CHARS) {
    return current;
  }
  return `${current}${String(chunk)}`.slice(0, MAX_PROCESS_OUTPUT_CHARS);
}

export const runCodexCommand: CodexCommandRunner = (args, options) => {
  const command = process.env.TOKENFORGE_CODEX_PATH?.trim() || "codex";

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: buildCodexEnvironment(),
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

function failureDetail(result: CodexCommandResult): string {
  return (result.stderr.trim() || result.stdout.trim()).slice(0, 500);
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

function hasFindingsArray(value: unknown): value is { findings: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { findings?: unknown }).findings)
  );
}

async function assertCodexReady(
  run: CodexCommandRunner,
  cwd: string,
): Promise<void> {
  let status: CodexCommandResult;
  try {
    status = await run(["login", "status"], {
      cwd,
      timeoutMs: CODEX_STATUS_TIMEOUT_MS,
    });
  } catch (error) {
    if (isMissingExecutable(error)) {
      throw new RuntimeError(
        "Codex CLI is not installed or is not available on PATH. Install it, then run `codex login`.",
      );
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Could not check Codex CLI authentication. ${reason}`);
  }

  if (status.timedOut) {
    throw new RuntimeError("Timed out while checking Codex CLI authentication.");
  }
  if (status.exitCode !== 0) {
    const detail = failureDetail(status);
    throw new RuntimeError(
      `Codex CLI is not authenticated. Run \`codex login\` and sign in with ChatGPT.${
        detail ? ` ${detail}` : ""
      }`,
    );
  }

  const authMode = `${status.stdout}\n${status.stderr}`;
  if (/api[- ]?key|access token/i.test(authMode)) {
    throw new RuntimeError(
      "Codex CLI is authenticated with usage-based credentials. TokenForge requires ChatGPT sign-in for the Codex backend; run `codex logout`, then `codex login`.",
    );
  }
  if (!/chatgpt/i.test(authMode)) {
    throw new RuntimeError(
      "TokenForge could not verify ChatGPT authentication in `codex login status`. Update Codex CLI and sign in with `codex login`.",
    );
  }
}

function requestedModel(model: string): string | undefined {
  const trimmed = model.trim();
  return trimmed.length === 0 || trimmed === "default" || trimmed === "none"
    ? undefined
    : trimmed;
}

function codexExecArgs(schemaPath: string, model: string | undefined): string[] {
  return [
    "exec",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--ignore-rules",
    "--color",
    "never",
    "--output-schema",
    schemaPath,
    ...(model ? ["--model", model] : []),
    "-",
  ];
}

/** Codex CLI enricher using the user's saved ChatGPT authentication. */
export function createCodexEnricher(
  run: CodexCommandRunner = runCodexCommand,
): LlmEnricher {
  return {
    id: "codex",
    async enrich(input) {
      const started = Date.now();
      const model = requestedModel(input.model);
      const reportedModel = model ?? "default";
      const timeoutMs = resolveCodexTimeoutMs(input.timeoutMs);
      const progress = input.onProgress;

      if (input.endpoint?.trim()) {
        throw new UsageError(
          "--llm-endpoint is not supported by the Codex CLI backend.",
        );
      }

      if (input.candidates.length === 0) {
        return {
          findings: [],
          meta: {
            backend: "codex",
            model: reportedModel,
            durationMs: 0,
            candidatesSent: 0,
          },
        };
      }

      progress?.(
        `Privacy warning: Codex enrichment will send ${input.candidates.length} bounded ` +
          "source-code excerpt(s) to OpenAI through the user's Codex CLI session; data may " +
          "leave this machine. TokenForge never sends the whole repository.",
      );
      if (!input.externalDataConsent) {
        throw new UsageError(
          "Codex enrichment requires confirmation. Review the privacy warning and rerun with --allow-external.",
        );
      }

      const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-codex-"));
      const schemaPath = join(temporaryRoot, "enrichment-output.schema.json");

      try {
        await writeFile(schemaPath, JSON.stringify(CODEX_OUTPUT_SCHEMA), "utf8");
        await assertCodexReady(run, temporaryRoot);

        const batches = chunkCandidates(input.candidates, CODEX_BATCH_SIZE);
        const findings = [];

        for (let index = 0; index < batches.length; index += 1) {
          const batch = batches[index]!;
          progress?.(
            `Codex enricher: batch ${index + 1}/${batches.length} ` +
              `(${batch.length} file(s), timeout ${Math.round(timeoutMs / 1000)}s per batch)…`,
          );

          let result: CodexCommandResult;
          try {
            result = await run(codexExecArgs(schemaPath, model), {
              cwd: temporaryRoot,
              input: buildEnrichmentPrompt(batch),
              timeoutMs,
            });
          } catch (error) {
            if (isMissingExecutable(error)) {
              throw new RuntimeError(
                "Codex CLI is not installed or is not available on PATH. Install it, then run `codex login`.",
              );
            }
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(`Could not start Codex CLI. ${reason}`);
          }

          if (result.timedOut) {
            throw new RuntimeError(
              `Codex CLI enrichment timed out after ${Math.round(timeoutMs / 1000)}s. ` +
                "Retry with a higher --llm-timeout (seconds) or scan a smaller folder.",
            );
          }
          if (result.exitCode !== 0) {
            const detail = failureDetail(result);
            throw new RuntimeError(
              `Codex CLI enrichment failed (exit ${result.exitCode ?? "unknown"}).${
                detail ? ` ${detail}` : ""
              }`,
            );
          }

          try {
            const payload = extractJsonPayload(result.stdout);
            if (!hasFindingsArray(payload)) {
              throw new Error('response must contain a "findings" array');
            }
            const structured = parseStructuredFindings(payload, batch);
            findings.push(...mapStructuredFindings(structured, batch));
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new RuntimeError(
              `Codex CLI returned malformed structured output. ${reason}`,
            );
          }
        }

        progress?.(
          `Codex enricher: finished in ${Math.round((Date.now() - started) / 1000)}s ` +
            `(${findings.length} finding(s)).`,
        );

        return {
          findings,
          meta: {
            backend: "codex",
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

export const codexEnricher = createCodexEnricher();
