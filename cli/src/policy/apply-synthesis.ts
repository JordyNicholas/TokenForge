import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  isInstructionPath,
  parseApplyMode,
  resolvePolicyMaxBytes,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import {
  parseLlmSpec,
  parseLlmTimeoutSeconds,
  synthesizePolicyHeuristic,
  synthesizePolicyWithCursorCli,
  type PolicySynthesisResult,
} from "@tokenforge/enrichers";
import type { ApplyOptions } from "../commands/apply/apply";
import { readTokenForgeConfig } from "../io/tokenforge-config";

async function loadInstructionContentsForPolicy(
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

export async function synthesizeManagedInstructionBody(options: {
  root: string;
  report: TokenRiskReport;
  title: string;
  applyOptions: ApplyOptions;
  keepDirs?: ReadonlySet<string>;
  sourceRoots?: readonly string[];
}): Promise<PolicySynthesisResult> {
  const config = await readTokenForgeConfig(options.root);
  const applyMode =
    parseApplyMode(options.applyOptions.mode) ??
    config?.apply?.mode ??
    "heuristic";
  const maxBytes = resolvePolicyMaxBytes({
    applyMode,
    config,
    cliOverride: options.applyOptions.policyMaxBytes,
  });
  const instructionContents = await loadInstructionContentsForPolicy(
    options.root,
    options.report,
  );
  const baseInput = {
    report: options.report,
    title: options.title,
    maxBytes,
    config,
    instructionContents,
    keepDirs: options.keepDirs,
    sourceRoots: options.sourceRoots,
    onProgress: options.applyOptions.onProgress,
  };

  if (applyMode !== "hybrid") {
    return synthesizePolicyHeuristic({
      ...baseInput,
      model: "none",
    });
  }

  const spec = parseLlmSpec(options.applyOptions.llm);
  if (spec.backend === "noop") {
    return synthesizePolicyHeuristic({
      ...baseInput,
      model: spec.model,
    });
  }

  if (spec.backend === "cursor-cli") {
    const timeoutSeconds = parseLlmTimeoutSeconds(options.applyOptions.llmTimeout);
    return synthesizePolicyWithCursorCli({
      ...baseInput,
      model: spec.model,
      timeoutMs: timeoutSeconds !== undefined ? timeoutSeconds * 1000 : undefined,
      externalDataConsent: options.applyOptions.externalDataConsent,
    });
  }

  options.applyOptions.onProgress?.(
    `Hybrid apply: backend ${spec.backend} policy synthesis not wired yet — using heuristic compiler.`,
  );
  return synthesizePolicyHeuristic({
    ...baseInput,
    model: spec.model,
  });
}
