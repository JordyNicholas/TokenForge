import { describe, expect, it, vi } from "vitest";
import { RuntimeError, UsageError } from "../errors";
import {
  buildClaudeCodeEnvironment,
  claudeCodeArgs,
  createClaudeCodeEnricher,
  type ClaudeCodeCommandResult,
  type ClaudeCodeCommandRunner,
} from "./claude-code";

const candidate = {
  path: "AGENTS.md",
  bytes: 900,
  estTokens: 225,
  excerpt: "# Rules\n- prefer tabs",
};

function commandResult(
  overrides: Partial<ClaudeCodeCommandResult> = {},
): ClaudeCodeCommandResult {
  return { exitCode: 0, stdout: "", stderr: "", timedOut: false, ...overrides };
}

/** `--output-format json` + `--json-schema`: the object lands on structured_output. */
function envelope(findings: unknown): ClaudeCodeCommandResult {
  return commandResult({
    stdout: JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: "Analyzed 1 file.",
      structured_output: { findings },
      session_id: "abc123",
    }),
  });
}

function okRunner(findings: unknown = []) {
  return vi.fn<ClaudeCodeCommandRunner>(async () => envelope(findings));
}

function enrich(runner: ClaudeCodeCommandRunner, overrides = {}) {
  return createClaudeCodeEnricher(runner).enrich({
    root: "/repo",
    model: "default",
    candidates: [candidate],
    externalDataConsent: true,
    ...overrides,
  });
}

describe("claudeCodeEnricher", () => {
  it("removes Anthropic API credentials from the child environment", () => {
    expect(
      buildClaudeCodeEnvironment({
        ANTHROPIC_API_KEY: "sk-ant-secret",
        ANTHROPIC_AUTH_TOKEN: "token-secret",
        PATH: "preserved",
      }),
    ).toEqual({ PATH: "preserved" });
  });

  it("never passes --dangerously-skip-permissions or --bare", () => {
    const args = claudeCodeArgs(undefined);

    // bypassPermissions would auto-approve every tool; --bare would skip the
    // subscription login this backend exists to use.
    expect(args).not.toContain("--dangerously-skip-permissions");
    expect(args).not.toContain("--bare");
    // Documented but absent from the CLI (v2.1.247): passing it is a hard error.
    expect(args).not.toContain("--max-turns");
    expect(args.slice(args.indexOf("--permission-mode"))).toContain("dontAsk");
  });

  it("constructs a bounded single-turn request and maps structured output", async () => {
    const runner = vi.fn<ClaudeCodeCommandRunner>(async (args, options) => {
      expect(args).toEqual(
        expect.arrayContaining([
          "-p",
          "--output-format",
          "json",
          "--json-schema",
          "--strict-mcp-config",
        ]),
      );
      expect(args).not.toContain("--model");

      const schema = JSON.parse(String(args[args.indexOf("--json-schema") + 1]));
      expect(schema).toMatchObject({ type: "object", required: ["findings"] });

      // The scanned repo must not configure the process analyzing it.
      expect(options.cwd).not.toBe("/repo");
      expect(options.input).toContain("### AGENTS.md");
      expect(options.input).toContain("prefer tabs");

      return envelope([
        {
          path: "AGENTS.md",
          verdict: "review",
          reason: "redundant_instructions",
          confidence: 0.7,
          detail: "Repeats rules already in .cursor/rules",
          suggestion: null,
        },
      ]);
    });

    const result = await enrich(runner);

    expect(runner).toHaveBeenCalledTimes(1);
    expect(result.findings[0]).toMatchObject({
      path: "AGENTS.md",
      source: "llm",
      action: "kept",
      reason: "redundant_instructions",
    });
    expect(result.meta).toMatchObject({
      backend: "claude-code",
      model: "default",
      candidatesSent: 1,
    });
  });

  it("passes an explicitly configured model", async () => {
    const runner = okRunner();

    const result = await enrich(runner, { model: "claude-opus-5" });

    const args = runner.mock.calls[0]![0];
    expect(args.slice(args.indexOf("--model"))).toEqual([
      "--model",
      "claude-opus-5",
    ]);
    expect(result.meta.model).toBe("claude-opus-5");
  });

  it("falls back to the result text when the CLI ignores --json-schema", async () => {
    // Claude Code before v2.1.205 silently ignored the schema and answered in prose.
    const runner = vi.fn<ClaudeCodeCommandRunner>(async () =>
      commandResult({
        stdout: JSON.stringify({
          subtype: "success",
          is_error: false,
          result:
            'Here you go:\n```json\n{"findings":[{"path":"AGENTS.md","verdict":"exclude",' +
            '"reason":"semantic_bloat","confidence":0.6,"detail":null,"suggestion":null}]}\n```',
        }),
      }),
    );

    const result = await enrich(runner);

    expect(result.findings[0]).toMatchObject({
      path: "AGENTS.md",
      action: "excluded",
      reason: "semantic_bloat",
    });
  });

  it("requires privacy confirmation before starting the CLI", async () => {
    const runner = okRunner();
    const onProgress = vi.fn();

    await expect(
      createClaudeCodeEnricher(runner).enrich({
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
    const missing = vi.fn<ClaudeCodeCommandRunner>(async () => {
      throw Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
    });

    await expect(enrich(missing)).rejects.toThrow("is not installed");
  });

  it("recognizes an unauthenticated CLI from either failure channel", async () => {
    // Exit code path: an invalid flag or startup failure writes to stderr.
    const viaExitCode = vi.fn<ClaudeCodeCommandRunner>(async () =>
      commandResult({ exitCode: 1, stderr: "Invalid API key · Please run /login" }),
    );
    await expect(enrich(viaExitCode)).rejects.toThrow("not authenticated");

    // In-run path: the CLI exits 0 and reports the failure as the result.
    const viaEnvelope = vi.fn<ClaudeCodeCommandRunner>(async () =>
      commandResult({
        stdout: JSON.stringify({
          subtype: "error_during_execution",
          is_error: true,
          result: "authentication_failed: run /login",
        }),
      }),
    );
    await expect(enrich(viaEnvelope)).rejects.toThrow("not authenticated");
  });

  it("reports timeout, provider failure, and malformed output", async () => {
    const assertFailure = async (
      execResult: ClaudeCodeCommandResult,
      expected: string,
    ) => {
      const runner = vi.fn<ClaudeCodeCommandRunner>(async () => execResult);
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
      commandResult({
        stdout: JSON.stringify({ subtype: "error_max_turns", is_error: true }),
      }),
      "reported a failed run",
    );
    await assertFailure(
      commandResult({ stdout: JSON.stringify({ subtype: "success" }) }),
      "empty result",
    );
  });

  it("drops findings the batch never asked about", async () => {
    // The schema constrains shape, not truthfulness: a path outside the batch
    // has no bytes/estTokens to attach, so it cannot become a finding.
    const runner = okRunner([
      {
        path: "some/other/file.md",
        verdict: "exclude",
        reason: "semantic_bloat",
        confidence: 0.9,
        detail: null,
        suggestion: null,
      },
    ]);

    const result = await enrich(runner);

    expect(result.findings).toEqual([]);
  });

  it("rejects endpoint configuration because the CLI owns its connection", async () => {
    const runner = okRunner();

    await expect(
      enrich(runner, { endpoint: "https://api.anthropic.com/v1" }),
    ).rejects.toThrow("not supported by the Claude Code CLI backend");
    expect(runner).not.toHaveBeenCalled();
  });

  it("does not invoke the CLI when there are no candidates", async () => {
    const runner = okRunner();

    const result = await createClaudeCodeEnricher(runner).enrich({
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

    expect(runner).toHaveBeenCalledTimes(3); // CLAUDE_CODE_BATCH_SIZE = 4
  });

  it("wraps unexpected command startup failures", async () => {
    const runner = vi.fn<ClaudeCodeCommandRunner>(async () => {
      throw new Error("permission denied");
    });

    await expect(enrich(runner)).rejects.toBeInstanceOf(RuntimeError);
  });
});
