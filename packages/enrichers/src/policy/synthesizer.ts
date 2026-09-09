import {
  resolvePolicyMaxBytes,
  synthesizeLeanInstructions,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { extractJsonPayload } from "../structured";
import { buildPolicySynthesisPrompt, parsePolicyMarkdownPayload } from "./prompt";
import type { PolicySynthesisInput, PolicySynthesisResult } from "./types";

export type LlmPromptRunner = (input: {
  prompt: string;
  model: string;
  timeoutMs: number;
  externalDataConsent?: boolean;
  onProgress?: (message: string) => void;
}) => Promise<string>;

/** Deterministic fallback — same as heuristic apply today. */
export function synthesizePolicyHeuristic(
  input: PolicySynthesisInput,
): PolicySynthesisResult {
  const maxBytes =
    input.maxBytes ??
    resolvePolicyMaxBytes({ applyMode: "heuristic", config: input.config });
  const markdown = synthesizeLeanInstructions(input.report, {
    title: input.title,
    maxBytes,
    completeSummaries: true,
    keepDirs: input.keepDirs,
    sourceRoots: input.sourceRoots,
    stackProfile: input.stackProfile,
    directoryRoles: input.directoryRoles,
    reasoningPack: input.reasoningPack,
    scopedTable: input.scopedTable,
    existingInstructionTexts: [...input.instructionContents.values()],
  });
  return {
    markdown,
    backend: "heuristic",
    model: "none",
    bytes: Buffer.byteLength(markdown, "utf8"),
    policyMaxBytes: maxBytes,
  };
}

export async function synthesizePolicyHybrid(
  input: PolicySynthesisInput,
  run: LlmPromptRunner,
): Promise<PolicySynthesisResult> {
  const maxBytes =
    input.maxBytes ??
    resolvePolicyMaxBytes({ applyMode: "hybrid", config: input.config });
  const prompt = buildPolicySynthesisPrompt({
    report: input.report,
    title: input.title,
    maxBytes,
    instructionContents: input.instructionContents,
  });

  input.onProgress?.("Policy synthesizer: compiling managed section with LLM…");
  const stdout = await run({
    prompt,
    model: input.model,
    timeoutMs: input.timeoutMs ?? 900_000,
    externalDataConsent: input.externalDataConsent,
    onProgress: input.onProgress,
  });

  let markdown: string | undefined;
  try {
    markdown = parsePolicyMarkdownPayload(extractJsonPayload(stdout));
  } catch {
    markdown = undefined;
  }

  if (!markdown) {
    input.onProgress?.(
      "Policy synthesizer: LLM output invalid — falling back to heuristic synthesis.",
    );
    return synthesizePolicyHeuristic({ ...input, maxBytes });
  }

  let body = markdown;
  if (Buffer.byteLength(body, "utf8") > maxBytes) {
    input.onProgress?.(
      `Policy synthesizer: LLM output ${Buffer.byteLength(body, "utf8")} bytes exceeds budget ${maxBytes} — falling back to heuristic synthesis.`,
    );
    return synthesizePolicyHeuristic({ ...input, maxBytes });
  }

  if (!body.endsWith("\n")) {
    body = `${body}\n`;
  }

  return {
    markdown: body,
    backend: input.backend ?? "llm",
    model: input.model,
    bytes: Buffer.byteLength(body, "utf8"),
    policyMaxBytes: maxBytes,
  };
}

export function wrapPolicySection(markdown: string): string {
  return `<!-- tokenforge:begin -->\n${markdown}<!-- tokenforge:end -->\n`;
}

export function policyBodyFromReport(
  report: TokenRiskReport,
  wrapped: string,
): string {
  return wrapped;
}
