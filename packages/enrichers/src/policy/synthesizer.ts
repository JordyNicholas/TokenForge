import {
  resolvePolicyMaxBytes,
  synthesizeLeanInstructions,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { extractJsonPayload } from "../structured";
import { buildPolicySynthesisPrompt, parsePolicyMarkdownPayload } from "./prompt";
import {
  parsePolicyReasoningPayload,
  refineReasoning,
  renderRefinedReasoningSection,
  spliceReasoningSection,
} from "./reasoningPayload";
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
    stackProfile: input.stackProfile,
    directoryRoles: input.directoryRoles,
    sampleFileContents: input.sampleFileContents,
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
  let payload: unknown;
  try {
    payload = extractJsonPayload(stdout);
    markdown = parsePolicyMarkdownPayload(payload);
  } catch {
    markdown = undefined;
  }

  if (!markdown) {
    input.onProgress?.(
      "Policy synthesizer: LLM output invalid — falling back to heuristic synthesis.",
    );
    return synthesizePolicyHeuristic({ ...input, maxBytes });
  }

  let body = applyReasoningRefinement(input, payload, markdown);
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

/**
 * Rebuild the reasoning section from the refinement, deterministically.
 *
 * The model contributes judgement - is this directory really linear, what is
 * the state flow actually shaped like - while row order, the byte sub-budget,
 * the trim behaviour and the heading stay on this side. Handing a model the
 * whole document and hoping it respects all four is how a well-written
 * paragraph ends up over budget with a strategy label in it.
 *
 * Every failure here costs the sharpening and nothing else: with no usable
 * refinement the markdown keeps whatever the model wrote, and the caller
 * still falls back to the deterministic pack if that busts the budget.
 */
function applyReasoningRefinement(
  input: PolicySynthesisInput,
  payload: unknown,
  markdown: string,
): string {
  const assignments = input.directoryRoles ?? [];
  const mode = input.reasoningPack ?? "off";
  if (assignments.length === 0 || mode === "off") {
    return markdown;
  }

  const parsed = parsePolicyReasoningPayload(payload);
  const refinement = refineReasoning({ assignments, payload: parsed });

  for (const rejection of refinement.rejections) {
    input.onProgress?.(
      `Policy synthesizer: dropped refined rule for ${rejection.glob} (${rejection.reason}) — keeping the deterministic rule.`,
    );
  }

  const section = renderRefinedReasoningSection({
    refinement,
    stackProfile: input.stackProfile,
    mode,
    scopedTable: input.scopedTable,
    existingInstructionTexts: [...input.instructionContents.values()],
  });

  return spliceReasoningSection(markdown, section);
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
