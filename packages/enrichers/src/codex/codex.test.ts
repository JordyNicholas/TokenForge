import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { RuntimeError, UsageError } from "../errors";
import {
  buildCodexEnvironment,
  createCodexEnricher,
  type CodexCommandResult,
  type CodexCommandRunner,
} from "./codex";

const candidate = {
  path: "README.md",
  bytes: 800,
  estTokens: 200,
  excerpt: "# Demo",
};

function commandResult(
  overrides: Partial<CodexCommandResult> = {},
): CodexCommandResult {
  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    timedOut: false,
    ...overrides,
  };
}

function successfulRunner(output: unknown = { findings: [] }) {
  return vi.fn<CodexCommandRunner>(async (args) =>
    args[0] === "login"
      ? commandResult({ stdout: "Logged in using ChatGPT" })
      : commandResult({ stdout: JSON.stringify(output) }),
  );
}

describe("codexEnricher", () => {
  it("removes API credentials from the Codex child environment", () => {
    expect(
      buildCodexEnvironment({
        OPENAI_API_KEY: "openai-secret",
        CODEX_API_KEY: "codex-secret",
        SAFE_VALUE: "preserved",
      }),
    ).toEqual({ SAFE_VALUE: "preserved" });
  });

  it("constructs a bounded non-interactive request and maps structured output", async () => {
    let schema: unknown;
    const runner = vi.fn<CodexCommandRunner>(async (args, options) => {
      if (args[0] === "login") {
        expect(args).toEqual(["login", "status"]);
        expect(options.input).toBeUndefined();
        return commandResult({ stdout: "Logged in using ChatGPT" });
      }

      const schemaIndex = args.indexOf("--output-schema");
      schema = JSON.parse(
        await readFile(String(args[schemaIndex + 1]), "utf8"),
      );
      expect(args).toEqual(
        expect.arrayContaining([
          "exec",
          "--ephemeral",
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--ignore-rules",
          "-",
        ]),
      );
      expect(args).not.toContain("--model");
      expect(options.cwd).not.toBe("/repo");
      expect(options.input).toContain("### README.md");
      expect(options.input).toContain("# Demo");

      return commandResult({
        stdout: JSON.stringify({
          findings: [
            {
              path: "README.md",
              verdict: "exclude",
              reason: "low_signal_config",
              confidence: 0.75,
              detail: "Mostly boilerplate",
              suggestion: null,
            },
          ],
        }),
      });
    });

    const result = await createCodexEnricher(runner).enrich({
      root: "/repo",
      model: "default",
      candidates: [candidate],
      externalDataConsent: true,
    });

    expect(runner).toHaveBeenCalledTimes(2);
    expect(schema).toMatchObject({
      type: "object",
      required: ["findings"],
    });
    expect(result.findings[0]).toMatchObject({
      path: "README.md",
      source: "llm",
      action: "excluded",
      reason: "low_signal_config",
    });
    expect(result.meta).toMatchObject({
      backend: "codex",
      model: "default",
      candidatesSent: 1,
    });
  });

  it("passes an explicitly configured model to Codex", async () => {
    const runner = successfulRunner();

    const result = await createCodexEnricher(runner).enrich({
      root: "/repo",
      model: "gpt-5.6-sol",
      candidates: [candidate],
      externalDataConsent: true,
    });

    const execArgs = runner.mock.calls[1]?.[0] ?? [];
    expect(execArgs.slice(execArgs.indexOf("--model"), -1)).toEqual([
      "--model",
      "gpt-5.6-sol",
    ]);
    expect(result.meta.model).toBe("gpt-5.6-sol");
  });

  it("requires privacy confirmation before starting Codex", async () => {
    const runner = successfulRunner();
    const onProgress = vi.fn();

    await expect(
      createCodexEnricher(runner).enrich({
        root: "/repo",
        model: "default",
        candidates: [candidate],
        onProgress,
      }),
    ).rejects.toBeInstanceOf(UsageError);

    expect(onProgress).toHaveBeenCalledWith(
      expect.stringContaining("Privacy warning"),
    );
    expect(runner).not.toHaveBeenCalled();
  });

  it("reports a missing CLI and an unauthenticated CLI cleanly", async () => {
    const missing = vi.fn<CodexCommandRunner>(async () => {
      throw Object.assign(new Error("spawn codex ENOENT"), { code: "ENOENT" });
    });

    await expect(
      createCodexEnricher(missing).enrich({
        root: "/repo",
        model: "default",
        candidates: [candidate],
        externalDataConsent: true,
      }),
    ).rejects.toThrow("Codex CLI is not installed");

    const loggedOut = vi.fn<CodexCommandRunner>(async () =>
      commandResult({ exitCode: 1, stderr: "Not logged in" }),
    );
    await expect(
      createCodexEnricher(loggedOut).enrich({
        root: "/repo",
        model: "default",
        candidates: [candidate],
        externalDataConsent: true,
      }),
    ).rejects.toThrow("Run `codex login`");
  });

  it("rejects usage-based Codex authentication", async () => {
    const runner = vi.fn<CodexCommandRunner>(async () =>
      commandResult({ stdout: "Logged in using an API key" }),
    );

    await expect(
      createCodexEnricher(runner).enrich({
        root: "/repo",
        model: "default",
        candidates: [candidate],
        externalDataConsent: true,
      }),
    ).rejects.toThrow("requires ChatGPT sign-in");
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("reports timeout, provider failure, and malformed output", async () => {
    const assertFailure = async (
      execResult: CodexCommandResult,
      expected: string,
    ) => {
      const runner = vi.fn<CodexCommandRunner>(async (args) =>
        args[0] === "login"
          ? commandResult({ stdout: "Logged in using ChatGPT" })
          : execResult,
      );
      await expect(
        createCodexEnricher(runner).enrich({
          root: "/repo",
          model: "default",
          candidates: [candidate],
          timeoutMs: 10_000,
          externalDataConsent: true,
        }),
      ).rejects.toThrow(expected);
    };

    await assertFailure(
      commandResult({ timedOut: true, exitCode: null }),
      "timed out after 10s",
    );
    await assertFailure(
      commandResult({ exitCode: 1, stderr: "network unavailable" }),
      "network unavailable",
    );
    await assertFailure(
      commandResult({ stdout: "not JSON" }),
      "malformed structured output",
    );
    await assertFailure(
      commandResult({ stdout: "{}" }),
      'must contain a "findings" array',
    );
  });

  it("rejects endpoint configuration because Codex owns its connection", async () => {
    const runner = successfulRunner();

    await expect(
      createCodexEnricher(runner).enrich({
        root: "/repo",
        model: "default",
        endpoint: "https://api.openai.com/v1",
        candidates: [candidate],
        externalDataConsent: true,
      }),
    ).rejects.toThrow("not supported by the Codex CLI backend");
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not invoke Codex when there are no candidates", async () => {
    const runner = successfulRunner();

    const result = await createCodexEnricher(runner).enrich({
      root: "/repo",
      model: "default",
      candidates: [],
    });

    expect(runner).not.toHaveBeenCalled();
    expect(result.findings).toEqual([]);
    expect(result.meta.candidatesSent).toBe(0);
  });

  it("wraps unexpected command startup failures", async () => {
    const runner = vi.fn<CodexCommandRunner>(async () => {
      throw new Error("permission denied");
    });

    await expect(
      createCodexEnricher(runner).enrich({
        root: "/repo",
        model: "default",
        candidates: [candidate],
        externalDataConsent: true,
      }),
    ).rejects.toBeInstanceOf(RuntimeError);
  });
});
