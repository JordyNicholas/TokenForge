import { describe, expect, it, vi } from "vitest";
import { RuntimeError, UsageError } from "../errors";
import {
  createCursorCliEnricher,
  cursorCliArgs,
  extractCursorPayload,
  type CursorCliCommandResult,
  type CursorCliCommandRunner,
} from "./cursor-cli";

const candidate = {
  path: "AGENTS.md",
  bytes: 900,
  estTokens: 225,
  excerpt: "# Rules\n- prefer tabs",
};

function commandResult(
  overrides: Partial<CursorCliCommandResult> = {},
): CursorCliCommandResult {
  return { exitCode: 0, stdout: "", stderr: "", timedOut: false, ...overrides };
}

function envelope(result: string, overrides: Partial<{ subtype: string; is_error: boolean }> = {}) {
  return commandResult({
    stdout: JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result,
      ...overrides,
    }),
  });
}

function okRunner(response: string = '{"findings":[]}') {
  return vi.fn<CursorCliCommandRunner>(async (args) => {
    if (args[0] === "status") {
      return commandResult({
        stdout: JSON.stringify({ authenticated: true, email: "dev@example.com" }),
      });
    }
    return envelope('```json\n' + response + '\n```');
  });
}

function authThenBatchRunner(batchResult: CursorCliCommandResult) {
  return vi.fn<CursorCliCommandRunner>(async (args) => {
    if (args[0] === "status") {
      return commandResult({
        stdout: JSON.stringify({ authenticated: true, email: "dev@example.com" }),
      });
    }
    return batchResult;
  });
}

function enrich(runner: CursorCliCommandRunner, overrides = {}) {
  return createCursorCliEnricher(runner).enrich({
    root: "/repo",
    model: "default",
    candidates: [candidate],
    externalDataConsent: true,
    ...overrides,
  });
}

describe("cursorCliEnricher", () => {
  it("never passes --force or --yolo", () => {
    const args = cursorCliArgs(undefined, "/tmp/workspace");

    expect(args).not.toContain("--force");
    expect(args).not.toContain("--yolo");
    expect(args).toContain("--mode");
    expect(args).toContain("ask");
    expect(args).toContain("--trust");
    expect(args).toContain("--workspace");
    expect(args).toContain("/tmp/workspace");
  });

  it("constructs a bounded request and maps structured output", async () => {
    const runner = vi.fn<CursorCliCommandRunner>(async (args, options) => {
      if (args[0] === "status") {
        return commandResult({
          stdout: JSON.stringify({ authenticated: true, email: "dev@example.com" }),
        });
      }

      expect(args).toEqual(
        expect.arrayContaining([
          "-p",
          "--output-format",
          "json",
          "--mode",
          "ask",
          "--trust",
          "--workspace",
        ]),
      );
      expect(args).not.toContain("--model");
      expect(options.cwd).not.toBe("/repo");
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
      backend: "cursor-cli",
      model: "default",
      candidatesSent: 1,
    });
  });

  it("passes an explicitly configured model", async () => {
    const runner = okRunner();

    const result = await enrich(runner, { model: "composer-2.5" });

    const batchArgs = runner.mock.calls[1]![0];
    expect(batchArgs.slice(batchArgs.indexOf("--model"))).toEqual([
      "--model",
      "composer-2.5",
    ]);
    expect(result.meta.model).toBe("composer-2.5");
  });

  it("requires privacy confirmation before starting the CLI", async () => {
    const runner = okRunner();
    const onProgress = vi.fn();

    await expect(
      createCursorCliEnricher(runner).enrich({
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
    const missing = vi.fn<CursorCliCommandRunner>(async () => {
      throw Object.assign(new Error("spawn agent ENOENT"), { code: "ENOENT" });
    });

    await expect(enrich(missing)).rejects.toThrow("is not installed");
  });

  it("recognizes an unauthenticated CLI from failure channels", async () => {
    const viaExitCode = vi.fn<CursorCliCommandRunner>(async (args) => {
      if (args[0] === "status") {
        return commandResult({ exitCode: 1, stderr: "Please run agent login" });
      }
      return commandResult({ exitCode: 0, stdout: "{}" });
    });
    await expect(enrich(viaExitCode)).rejects.toThrow("not authenticated");

    const viaEnvelope = vi.fn<CursorCliCommandRunner>(async (args) => {
      if (args[0] === "status") {
        return commandResult({
          stdout: JSON.stringify({ authenticated: true, email: "dev@example.com" }),
        });
      }
      return envelope("authentication required", { subtype: "error", is_error: true });
    });
    await expect(enrich(viaEnvelope)).rejects.toThrow("not authenticated");
  });

  it("reports timeout, provider failure, and malformed output", async () => {
    const assertFailure = async (
      execResult: CursorCliCommandResult,
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
      enrich(runner, { endpoint: "https://api.cursor.com" }),
    ).rejects.toThrow("not supported by the Cursor CLI backend");
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not invoke the CLI when there are no candidates", async () => {
    const runner = okRunner();

    const result = await createCursorCliEnricher(runner).enrich({
      root: "/repo",
      model: "default",
      candidates: [],
    });

    expect(runner).not.toHaveBeenCalled();
    expect(result.findings).toEqual([]);
    expect(result.meta.candidatesSent).toBe(0);
  });

  it("splits candidates into bounded batches", async () => {
    const runner = okRunner();
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...candidate,
      path: `doc-${index}.md`,
    }));

    await enrich(runner, { candidates: many });

    expect(runner).toHaveBeenCalledTimes(4);
  });

  it("wraps unexpected command startup failures", async () => {
    const runner = vi.fn<CursorCliCommandRunner>(async () => {
      throw new Error("permission denied");
    });

    await expect(enrich(runner)).rejects.toBeInstanceOf(RuntimeError);
  });
});

describe("extractCursorPayload", () => {
  it("parses fenced JSON from the result field", () => {
    const payload = extractCursorPayload(
      JSON.stringify({
        subtype: "success",
        is_error: false,
        result: '```json\n{"findings":[]}\n```',
      }),
    );

    expect(payload).toEqual({ findings: [] });
  });
});
