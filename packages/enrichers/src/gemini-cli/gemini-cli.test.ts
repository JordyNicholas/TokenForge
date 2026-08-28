import { describe, expect, it, vi } from "vitest";
import { RuntimeError, UsageError } from "../errors";
import {
  buildGeminiCliEnvironment,
  createGeminiCliEnricher,
  extractGeminiPayload,
  geminiCliArgs,
  type GeminiCliCommandResult,
  type GeminiCliCommandRunner,
} from "./gemini-cli";

const candidate = {
  path: "AGENTS.md",
  bytes: 900,
  estTokens: 225,
  excerpt: "# Rules\n- prefer tabs",
};

function commandResult(
  overrides: Partial<GeminiCliCommandResult> = {},
): GeminiCliCommandResult {
  return { exitCode: 0, stdout: "", stderr: "", timedOut: false, ...overrides };
}

function envelope(response: string, error?: { message: string }): GeminiCliCommandResult {
  return commandResult({
    stdout: JSON.stringify({ response, ...(error ? { error } : {}) }),
  });
}

function okRunner(response: string = '{"findings":[]}') {
  return vi.fn<GeminiCliCommandRunner>(async (_args, options) => {
    if (options.input === "ok") {
      return envelope('{"findings":[]}');
    }
    return envelope('```json\n' + response + '\n```');
  });
}

function authThenBatchRunner(batchResult: GeminiCliCommandResult) {
  return vi.fn<GeminiCliCommandRunner>(async (_args, options) => {
    if (options.input === "ok") {
      return envelope('{"findings":[]}');
    }
    return batchResult;
  });
}

function enrich(runner: GeminiCliCommandRunner, overrides = {}) {
  return createGeminiCliEnricher(runner).enrich({
    root: "/repo",
    model: "default",
    candidates: [candidate],
    externalDataConsent: true,
    ...overrides,
  });
}

describe("geminiCliEnricher", () => {
  it("removes Google API credentials from the child environment", () => {
    expect(
      buildGeminiCliEnvironment({
        GEMINI_API_KEY: "secret",
        GOOGLE_API_KEY: "secret",
        PATH: "preserved",
      }),
    ).toEqual({ PATH: "preserved" });
  });

  it("never passes --yolo or --all-files", () => {
    const args = geminiCliArgs(undefined);

    expect(args).not.toContain("--yolo");
    expect(args).not.toContain("--all-files");
    expect(args).toContain("--approval-mode");
    expect(args).toContain("plan");
  });

  it("constructs a bounded request and maps structured output", async () => {
    const runner = vi.fn<GeminiCliCommandRunner>(async (args, options) => {
      expect(args).toEqual(
        expect.arrayContaining(["--output-format", "json", "--approval-mode", "plan"]),
      );
      expect(args).not.toContain("--model");

      expect(options.cwd).not.toBe("/repo");
      if (options.input === "ok") {
        return envelope('{"findings":[]}');
      }
      expect(options.input).toContain("### AGENTS.md");
      expect(options.input).toContain("prefer tabs");

      return envelope(
        JSON.stringify({
          findings: [
            {
              path: "AGENTS.md",
              verdict: "review",
              reason: "redundant_instructions",
              confidence: 0.7,
              detail: "Repeats rules already in .cursor/rules",
              suggestion: null,
            },
          ],
        }),
      );
    });

    const result = await enrich(runner);

    expect(runner).toHaveBeenCalledTimes(2);
    expect(result.findings[0]).toMatchObject({
      path: "AGENTS.md",
      source: "llm",
      action: "kept",
      reason: "redundant_instructions",
    });
    expect(result.meta).toMatchObject({
      backend: "gemini-cli",
      model: "default",
      candidatesSent: 1,
    });
  });

  it("passes an explicitly configured model", async () => {
    const runner = okRunner();

    const result = await enrich(runner, { model: "gemini-2.5-flash" });

    const args = runner.mock.calls[1]![0];
    expect(args.slice(args.indexOf("--model"))).toEqual([
      "--model",
      "gemini-2.5-flash",
    ]);
    expect(result.meta.model).toBe("gemini-2.5-flash");
  });

  it("requires privacy confirmation before starting the CLI", async () => {
    const runner = okRunner();
    const onProgress = vi.fn();

    await expect(
      createGeminiCliEnricher(runner).enrich({
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

  it("reports a missing CLI cleanly", async () => {
    const missing = vi.fn<GeminiCliCommandRunner>(async () => {
      throw Object.assign(new Error("spawn gemini ENOENT"), { code: "ENOENT" });
    });

    await expect(enrich(missing)).rejects.toThrow("is not installed");
  });

  it("recognizes an unauthenticated CLI from failure channels", async () => {
    const viaExitCode = vi.fn<GeminiCliCommandRunner>(async () =>
      commandResult({ exitCode: 1, stderr: "Please sign in with Google" }),
    );
    await expect(enrich(viaExitCode)).rejects.toThrow("not authenticated");

    const viaEnvelope = vi.fn<GeminiCliCommandRunner>(async () =>
      envelope("", { message: "authentication required" }),
    );
    await expect(enrich(viaEnvelope)).rejects.toThrow("not authenticated");
  });

  it("reports timeout, provider failure, and malformed output", async () => {
    const assertFailure = async (
      execResult: GeminiCliCommandResult,
      expected: string,
    ) => {
      const runner = authThenBatchRunner(execResult);
      await expect(enrich(runner, { timeoutMs: 10_000 })).rejects.toThrow(expected);
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
      commandResult({ stdout: "not JSON at all" }),
      "not the expected --output-format json envelope",
    );
    await assertFailure(
      envelope(""),
      "empty result",
    );
  });

  it("drops findings the batch never asked about", async () => {
    const runner = okRunner(
      JSON.stringify({
        findings: [
          {
            path: "some/other/file.md",
            verdict: "exclude",
            reason: "semantic_bloat",
            confidence: 0.9,
            detail: null,
            suggestion: null,
          },
        ],
      }),
    );

    const result = await enrich(runner);

    expect(result.findings).toEqual([]);
  });

  it("rejects endpoint configuration because the CLI owns its connection", async () => {
    const runner = okRunner();

    await expect(
      enrich(runner, { endpoint: "https://generativelanguage.googleapis.com" }),
    ).rejects.toThrow("not supported by the Gemini CLI backend");
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not invoke the CLI when there are no candidates", async () => {
    const runner = okRunner();

    const result = await createGeminiCliEnricher(runner).enrich({
      root: "/repo",
      model: "default",
      candidates: [],
    });

    expect(runner).not.toHaveBeenCalled();
    expect(result.findings).toEqual([]);
    expect(result.meta.candidatesSent).toBe(0);
  });

  it("sends the whole candidate set in one request", async () => {
    // Single pass: cross-file findings must not depend on where the chunker
    // happened to split the list.
    const runner = okRunner();
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...candidate,
      path: `doc-${index}.md`,
    }));

    await enrich(runner, { candidates: many });

    // Counted by prompt-carrying calls rather than total, because this backend
    // also makes an auth preflight that has nothing to do with batching.
    const enrichmentCalls = runner.mock.calls.filter(([, options]) =>
      String(options?.input ?? "").includes("### doc-"),
    );
    expect(enrichmentCalls).toHaveLength(1);
  });

  it("wraps unexpected command startup failures", async () => {
    const runner = vi.fn<GeminiCliCommandRunner>(async () => {
      throw new Error("permission denied");
    });

    await expect(enrich(runner)).rejects.toBeInstanceOf(RuntimeError);
  });
});

describe("extractGeminiPayload", () => {
  it("parses fenced JSON from the response field", () => {
    const payload = extractGeminiPayload(
      JSON.stringify({
        response: '```json\n{"findings":[]}\n```',
      }),
    );

    expect(payload).toEqual({ findings: [] });
  });
});
