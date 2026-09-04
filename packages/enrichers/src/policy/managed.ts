import {
  isInstructionPath,
  parseApplyMode,
  resolvePolicyMaxBytes,
  type ApplyMode,
  type TokenForgeConfig,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseLlmTimeoutSeconds } from "../limits";
import { parseLlmSpec } from "../parse";
import { createPolicyPromptRunner } from "./runners";
import { synthesizePolicyHeuristic, synthesizePolicyHybrid } from "./synthesizer";
import type { PolicySynthesisResult } from "./types";

export type SynthesizeManagedPolicyOptions = {
  root: string;
  report: TokenRiskReport;
  title: string;
  /** heuristic | hybrid — defaults to heuristic. */
  applyMode?: string;
  /** Same as CLI `--llm` / extension `tokenforge.llm`. */
  llm?: string;
  llmEndpoint?: string;
  /** Timeout in seconds (CLI `--llm-timeout`). */
  llmTimeoutSeconds?: number;
  policyMaxBytes?: number;
  config?: TokenForgeConfig;
  keepDirs?: ReadonlySet<string>;
  sourceRoots?: readonly string[];
  externalDataConsent?: boolean;
  onProgress?: (message: string) => void;
  /** Optional preloaded bodies; when omitted, loads from report instruction paths. */
  instructionContents?: ReadonlyMap<string, string>;
};

export async function loadInstructionContentsForPolicy(
  root: string,
  report: TokenRiskReport,
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  const paths = new Set<string>();
  for (const finding of report.findings) {
    if (isInstructionPath(finding.path)) {
      paths.add(finding.path);
    }
  }
  for (const file of report.instructionBudget?.files ?? []) {
    paths.add(file.path);
  }
  for (const path of paths) {
    try {
      contents.set(path, await readFile(join(root, path), "utf8"));
    } catch {
      // skip unreadable instruction paths
    }
  }
  return contents;
}

/**
 * Shared Fix synthesis for CLI apply and Extension Compact rules.
 * Heuristic by default; hybrid routes through backend-specific prompt runners.
 */
export async function synthesizeManagedPolicy(
  options: SynthesizeManagedPolicyOptions,
): Promise<PolicySynthesisResult> {
  const applyMode: ApplyMode =
    parseApplyMode(options.applyMode) ??
    options.config?.apply?.mode ??
    "heuristic";
  const maxBytes = resolvePolicyMaxBytes({
    applyMode,
    config: options.config,
    cliOverride: options.policyMaxBytes,
  });
  const instructionContents =
    options.instructionContents ??
    (await loadInstructionContentsForPolicy(options.root, options.report));

  const baseInput = {
    report: options.report,
    title: options.title,
    maxBytes,
    config: options.config,
    instructionContents,
    keepDirs: options.keepDirs,
    sourceRoots: options.sourceRoots,
    onProgress: options.onProgress,
  };

  if (applyMode !== "hybrid") {
    return synthesizePolicyHeuristic({
      ...baseInput,
      model: "none",
    });
  }

  const spec = parseLlmSpec(options.llm);
  if (spec.backend === "noop") {
    return synthesizePolicyHeuristic({
      ...baseInput,
      model: spec.model,
    });
  }

  const runner = createPolicyPromptRunner(spec.backend, {
    endpoint: options.llmEndpoint,
  });
  if (!runner) {
    options.onProgress?.(
      `Hybrid apply: backend ${spec.backend} policy synthesis not wired yet — using heuristic compiler.`,
    );
    return synthesizePolicyHeuristic({
      ...baseInput,
      model: spec.model,
    });
  }

  const timeoutSeconds = parseLlmTimeoutSeconds(
    options.llmTimeoutSeconds !== undefined
      ? String(options.llmTimeoutSeconds)
      : undefined,
  );

  return synthesizePolicyHybrid(
    {
      ...baseInput,
      model: spec.model,
      backend: spec.backend,
      timeoutMs: timeoutSeconds !== undefined ? timeoutSeconds * 1000 : undefined,
      externalDataConsent: options.externalDataConsent,
    },
    runner,
  );
}
