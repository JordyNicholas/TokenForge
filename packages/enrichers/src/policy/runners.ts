import type { LlmBackendId } from "@tokenforge/risk-core";
import { UsageError } from "../errors";
import { fetchWithTimeout } from "../fetchWithTimeout";
import {
  ANTHROPIC_API_VERSION,
  ANTHROPIC_MAX_OUTPUT_TOKENS,
  DEFAULT_ANTHROPIC_ENDPOINT,
  DEFAULT_OLLAMA_ENDPOINT,
  resolveAnthropicTimeoutMs,
  resolveClaudeCodeTimeoutMs,
  resolveCodexTimeoutMs,
  resolveGeminiCliTimeoutMs,
  resolveOllamaTimeoutMs,
} from "../limits";
import {
  runClaudeCodeCommand,
  type ClaudeCodeCommandRunner,
} from "../claude-code/claude-code";
import {
  runCodexCommand,
  type CodexCommandRunner,
} from "../codex/codex";
import {
  geminiCliArgs,
  runGeminiCliCommand,
  type GeminiCliCommandRunner,
} from "../gemini-cli/gemini-cli";
import { createCursorCliPolicyRunner } from "./cursor-cli";
import type { LlmPromptRunner } from "./synthesizer";

const OLLAMA_CHAT_PATH = "/api/chat";

function isMissingExecutable(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function requireExternalConsent(
  backend: string,
  externalDataConsent: boolean | undefined,
): void {
  if (!externalDataConsent) {
    throw new UsageError(
      `Hybrid apply with ${backend} requires confirmation. Rerun with --allow-external.`,
    );
  }
}

function createOllamaPolicyRunner(endpoint?: string): LlmPromptRunner {
  return async ({ prompt, model, timeoutMs, onProgress }) => {
    const base = (endpoint?.trim() || DEFAULT_OLLAMA_ENDPOINT).replace(/\/$/, "");
    const resolvedTimeout = resolveOllamaTimeoutMs(timeoutMs);
    onProgress?.(`Ollama policy synthesizer: invoking ${model}…`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), resolvedTimeout);
    try {
      const response = await fetchWithTimeout(
        `${base}${OLLAMA_CHAT_PATH}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [{ role: "user", content: prompt }],
          }),
          signal: controller.signal,
        },
        resolvedTimeout,
      );
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${body.slice(0, 300)}`);
      }
      const payload = (await response.json()) as { message?: { content?: string } };
      const content = payload.message?.content?.trim();
      if (!content) {
        throw new Error("Ollama returned an empty response.");
      }
      return content;
    } finally {
      clearTimeout(timer);
    }
  };
}

function createAnthropicPolicyRunner(endpoint?: string): LlmPromptRunner {
  return async ({ prompt, model, timeoutMs, externalDataConsent, onProgress }) => {
    requireExternalConsent("anthropic", externalDataConsent);
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Export it to use --llm anthropic:<model>.",
      );
    }
    const base = (endpoint?.trim() || DEFAULT_ANTHROPIC_ENDPOINT).replace(/\/$/, "");
    const resolvedTimeout = resolveAnthropicTimeoutMs(timeoutMs);
    onProgress?.(`Anthropic policy synthesizer: invoking ${model}…`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), resolvedTimeout);
    try {
      const response = await fetch(`${base}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: ANTHROPIC_MAX_OUTPUT_TOKENS,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Anthropic request failed (${response.status}): ${body.slice(0, 300)}`);
      }
      const payload = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const content = (payload.content ?? [])
        .filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join("")
        .trim();
      if (!content) {
        throw new Error("Anthropic returned an empty response.");
      }
      return content;
    } finally {
      clearTimeout(timer);
    }
  };
}

function createGeminiCliPolicyRunner(
  run: GeminiCliCommandRunner = runGeminiCliCommand,
): LlmPromptRunner {
  return async ({ prompt, model, timeoutMs, externalDataConsent, onProgress }) => {
    requireExternalConsent("gemini-cli", externalDataConsent);
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-policy-gemini-cli-"));
    try {
      const trimmed = model.trim();
      const modelArg =
        trimmed.length === 0 || trimmed === "default" || trimmed === "none"
          ? undefined
          : trimmed;
      onProgress?.("Gemini CLI policy synthesizer: invoking model…");
      const result = await run(geminiCliArgs(modelArg), {
        cwd: temporaryRoot,
        input: prompt,
        timeoutMs: resolveGeminiCliTimeoutMs(timeoutMs),
      });
      if (result.timedOut) {
        throw new Error(
          `Gemini CLI timed out after ${Math.round(resolveGeminiCliTimeoutMs(timeoutMs) / 1000)}s`,
        );
      }
      if (result.exitCode !== 0) {
        throw new Error(
          `Gemini CLI failed (exit ${result.exitCode ?? "unknown"}): ${result.stderr.trim().slice(0, 400)}`,
        );
      }
      return result.stdout;
    } catch (error) {
      if (isMissingExecutable(error)) {
        throw new Error(
          "Gemini CLI is not installed or is not available on PATH. Install @google/gemini-cli, then sign in.",
        );
      }
      throw error;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  };
}

/** Policy synthesis uses a markdown JSON schema instead of Detect findings schema. */
const POLICY_CLAUDE_CODE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["markdown"],
  properties: {
    markdown: { type: "string" },
  },
} as const;

function policyClaudeCodeArgs(model: string | undefined): string[] {
  return [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(POLICY_CLAUDE_CODE_SCHEMA),
    "--permission-mode",
    "dontAsk",
    "--strict-mcp-config",
    ...(model ? ["--model", model] : []),
  ];
}

function createClaudeCodePolicyRunner(
  run: ClaudeCodeCommandRunner = runClaudeCodeCommand,
): LlmPromptRunner {
  return async ({ prompt, model, timeoutMs, externalDataConsent, onProgress }) => {
    requireExternalConsent("claude-code", externalDataConsent);
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-policy-claude-code-"));
    try {
      const trimmed = model.trim();
      const modelArg =
        trimmed.length === 0 || trimmed === "default" || trimmed === "none"
          ? undefined
          : trimmed;
      onProgress?.("Claude Code policy synthesizer: invoking model…");
      const result = await run(policyClaudeCodeArgs(modelArg), {
        cwd: temporaryRoot,
        input: prompt,
        timeoutMs: resolveClaudeCodeTimeoutMs(timeoutMs),
      });
      if (result.timedOut) {
        throw new Error(
          `Claude Code timed out after ${Math.round(resolveClaudeCodeTimeoutMs(timeoutMs) / 1000)}s`,
        );
      }
      if (result.exitCode !== 0) {
        throw new Error(
          `Claude Code failed (exit ${result.exitCode ?? "unknown"}): ${result.stderr.trim().slice(0, 400)}`,
        );
      }
      return result.stdout;
    } catch (error) {
      if (isMissingExecutable(error)) {
        throw new Error(
          "Claude Code CLI is not installed or is not available on PATH. Install it, then sign in.",
        );
      }
      throw error;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  };
}

const POLICY_CODEX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["markdown"],
  properties: {
    markdown: { type: "string" },
  },
} as const;

function createCodexPolicyRunner(
  run: CodexCommandRunner = runCodexCommand,
): LlmPromptRunner {
  return async ({ prompt, model, timeoutMs, externalDataConsent, onProgress }) => {
    requireExternalConsent("codex", externalDataConsent);
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-policy-codex-"));
    try {
      const schemaPath = join(temporaryRoot, "policy-schema.json");
      await writeFile(schemaPath, `${JSON.stringify(POLICY_CODEX_SCHEMA)}\n`, "utf8");
      const trimmed = model.trim();
      const modelArg =
        trimmed.length === 0 || trimmed === "default" || trimmed === "none"
          ? undefined
          : trimmed;
      onProgress?.("Codex policy synthesizer: invoking model…");
      const args = [
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
        ...(modelArg ? ["--model", modelArg] : []),
        "-",
      ];
      const result = await run(args, {
        cwd: temporaryRoot,
        input: prompt,
        timeoutMs: resolveCodexTimeoutMs(timeoutMs),
      });
      if (result.timedOut) {
        throw new Error(
          `Codex timed out after ${Math.round(resolveCodexTimeoutMs(timeoutMs) / 1000)}s`,
        );
      }
      if (result.exitCode !== 0) {
        throw new Error(
          `Codex failed (exit ${result.exitCode ?? "unknown"}): ${result.stderr.trim().slice(0, 400)}`,
        );
      }
      return result.stdout;
    } catch (error) {
      if (isMissingExecutable(error)) {
        throw new Error(
          "Codex CLI is not installed or is not available on PATH. Install it, then run `codex login`.",
        );
      }
      throw error;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  };
}

/** Resolve an `LlmPromptRunner` for hybrid Fix policy synthesis. */
export function createPolicyPromptRunner(
  backend: LlmBackendId,
  options: { endpoint?: string } = {},
): LlmPromptRunner | undefined {
  switch (backend) {
    case "noop":
      return undefined;
    case "ollama":
      return createOllamaPolicyRunner(options.endpoint);
    case "anthropic":
      return createAnthropicPolicyRunner(options.endpoint);
    case "cursor-cli":
      return createCursorCliPolicyRunner();
    case "gemini-cli":
      return createGeminiCliPolicyRunner();
    case "claude-code":
      return createClaudeCodePolicyRunner();
    case "codex":
      return createCodexPolicyRunner();
    default:
      return undefined;
  }
}

/** Backends that send prompts off-machine for hybrid Fix. */
export function policyBackendRequiresExternalConsent(backend: LlmBackendId): boolean {
  return (
    backend === "anthropic" ||
    backend === "cursor-cli" ||
    backend === "gemini-cli" ||
    backend === "claude-code" ||
    backend === "codex"
  );
}
