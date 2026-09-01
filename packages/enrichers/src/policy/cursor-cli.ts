import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UsageError } from "../errors";
import { resolveCursorCliTimeoutMs } from "../limits";
import {
  assertCursorCliReady,
  cursorCliArgs,
  extractCursorPayload,
  runCursorCliCommand,
  type CursorCliCommandRunner,
} from "../cursor-cli/cursor-cli";
import { synthesizePolicyHybrid, type LlmPromptRunner } from "./synthesizer";
import type { PolicySynthesisInput, PolicySynthesisResult } from "./types";

export function createCursorCliPolicyRunner(
  run: CursorCliCommandRunner = runCursorCliCommand,
): LlmPromptRunner {
  return async ({ prompt, model, timeoutMs, externalDataConsent, onProgress }) => {
    if (!externalDataConsent) {
      throw new UsageError(
        "Hybrid apply with Cursor CLI requires confirmation. Rerun with --allow-external.",
      );
    }

    const temporaryRoot = await mkdtemp(join(tmpdir(), "tokenforge-policy-cursor-cli-"));
    try {
      await assertCursorCliReady(run, temporaryRoot);
      onProgress?.("Cursor CLI policy synthesizer: invoking model…");
      const invocation = cursorCliArgs(model, temporaryRoot, prompt);
      const result = await run(invocation.args, {
        cwd: temporaryRoot,
        input: invocation.input,
        timeoutMs,
      });
      if (result.timedOut) {
        throw new Error(`Cursor CLI timed out after ${Math.round(timeoutMs / 1000)}s`);
      }
      if (result.exitCode !== 0) {
        throw new Error(
          `Cursor CLI failed (exit ${result.exitCode ?? "unknown"}): ${result.stderr.trim()}`,
        );
      }
      const payload = extractCursorPayload(result.stdout);
      if (typeof payload === "object" && payload !== null && "result" in payload) {
        const inner = (payload as { result?: unknown }).result;
        if (typeof inner === "string") {
          return inner;
        }
      }
      return result.stdout;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  };
}

export async function synthesizePolicyWithCursorCli(
  input: PolicySynthesisInput,
  run: CursorCliCommandRunner = runCursorCliCommand,
): Promise<PolicySynthesisResult> {
  const timeoutMs = resolveCursorCliTimeoutMs(input.timeoutMs);
  return synthesizePolicyHybrid(
    {
      ...input,
      backend: "cursor-cli",
      timeoutMs,
    },
    createCursorCliPolicyRunner(run),
  );
}
