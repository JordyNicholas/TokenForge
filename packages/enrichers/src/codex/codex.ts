import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimeError, UsageError } from "../errors";
import {
  CODEX_STATUS_TIMEOUT_MS,
  resolveCodexTimeoutMs,
} from "../limits";
import { mapStructuredFindings } from "../parse";
import { resolveSinglePassAnalysisOverview } from "../singlePassOverview";
import { LLM_ANALYSIS_OVERVIEW_JSON_SCHEMA } from "../analysisOverviewSchema";
import {
  extractJsonPayload,
  parseStructuredFindings,
} from "../structured";
import {
  stageRepositoryForAudit,
  type RepositoryStagingResult,
} from "../staging/repoStaging";
import { buildCodexAuditPrompt } from "./auditPrompt";
import { CONTEXT_INDEX_RECOMMENDATIONS_JSON_SCHEMA } from "./contextIndexSchema";
import { contextIndexRecommendationsFromPayload } from "./contextIndex";
import type { LlmEnricher } from "../types";

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
    analysisOverview: LLM_ANALYSIS_OVERVIEW_JSON_SCHEMA,
    contextIndexRecommendations: CONTEXT_INDEX_RECOMMENDATIONS_JSON_SCHEMA,
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

export type StageRepositoryForAudit = (
  sourceRoot: string,
  destRoot: string,
) => Promise<RepositoryStagingResult>;

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

/** Codex CLI enricher — full-repo read-only audit with context-index proposals (#189). */
export function createCodexEnricher(
  run: CodexCommandRunner = runCodexCommand,
  stageRepository: StageRepositoryForAudit = stageRepositoryForAudit,
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
        "Privacy warning: Codex enrichment will copy a sanitized eligible repository tree " +
          "and send it to OpenAI through the user's Codex CLI session for one read-only audit; " +
          "credential-shaped paths and secret-shaped content are omitted. Data may leave this machine.",
      );
      if (!input.externalDataConsent) {
        throw new UsageError(
          "Codex enrichment requires confirmation. Review the privacy warning and rerun with --allow-external.",
        );
      }

      const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-codex-"));
      const schemaPath = join(temporaryRoot, "enrichment-output.schema.json");
      const stagedRoot = join(temporaryRoot, "repo");

      try {
        await writeFile(schemaPath, JSON.stringify(CODEX_OUTPUT_SCHEMA), "utf8");
        await assertCodexReady(run, temporaryRoot);

        progress?.("Codex enricher: staging sanitized repository copy…");
        const staging = await stageRepository(input.root, stagedRoot);
        progress?.(
          `Codex enricher: staged ${staging.coverage.filesCopied} file(s) ` +
            `(${staging.coverage.bytesCopied} bytes); running one repository audit ` +
            `(timeout ${Math.round(timeoutMs / 1000)}s)…`,
        );

        const prompt = buildCodexAuditPrompt({
          candidates: input.candidates,
          heuristicFindings: input.heuristicFindings,
        });

        let result: CodexCommandResult;
        try {
          result = await run(codexExecArgs(schemaPath, model), {
            cwd: stagedRoot,
            input: prompt,
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

        let findings = [];
        let payload: unknown;
        try {
          payload = extractJsonPayload(result.stdout);
          if (!hasFindingsArray(payload)) {
            throw new Error('response must contain a "findings" array');
          }
          const structured = parseStructuredFindings(payload, input.candidates);
          findings = mapStructuredFindings(structured, input.candidates);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new RuntimeError(
            `Codex CLI returned malformed structured output. ${reason}`,
          );
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
            analysisOverview: resolveSinglePassAnalysisOverview({
              payloads: [payload],
              findingCount: findings.length,
              candidateCount: input.candidates.length,
            }),
            contextIndexRecommendations:
              contextIndexRecommendationsFromPayload(payload),
            repoAuditCoverage: staging.coverage,
          },
        };
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    },
  };
}

export const codexEnricher = createCodexEnricher();
