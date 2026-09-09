import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  isInstructionPath,
  parseReasoningPackMode,
  resolveReasoningPackMode,
  type DirectoryRoleAssignment,
  type StackProfile,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import {
  synthesizeManagedPolicy,
  type SynthesizeManagedPolicyOptions,
  type PolicySynthesisResult,
} from "@tokenforge/enrichers";
import type { ApplyOptions } from "../commands/apply/apply";
import { readTokenForgeConfig } from "../io/tokenforge-config";

/** @deprecated Prefer synthesizeManagedPolicy from enrichers — kept for CLI call sites. */
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

export async function synthesizeManagedInstructionBody(options: {
  root: string;
  report: TokenRiskReport;
  title: string;
  applyOptions: ApplyOptions;
  keepDirs?: ReadonlySet<string>;
  sourceRoots?: readonly string[];
  stackProfile?: StackProfile;
  directoryRoles?: readonly DirectoryRoleAssignment[];
  instructionPath?: string;
}): Promise<PolicySynthesisResult> {
  const config = await readTokenForgeConfig(options.root);
  const timeoutRaw = options.applyOptions.llmTimeout;
  const llmTimeoutSeconds =
    timeoutRaw !== undefined && timeoutRaw.trim().length > 0
      ? Number(timeoutRaw)
      : undefined;
  const apply: SynthesizeManagedPolicyOptions = {
    root: options.root,
    report: options.report,
    title: options.title,
    applyMode: options.applyOptions.mode,
    llm: options.applyOptions.llm,
    llmEndpoint: options.applyOptions.llmEndpoint,
    llmTimeoutSeconds:
      llmTimeoutSeconds !== undefined && Number.isFinite(llmTimeoutSeconds)
        ? llmTimeoutSeconds
        : undefined,
    policyMaxBytes: options.applyOptions.policyMaxBytes,
    config,
    keepDirs: options.keepDirs,
    sourceRoots: options.sourceRoots,
    stackProfile: options.stackProfile,
    directoryRoles: options.directoryRoles,
    instructionPath: options.instructionPath,
    reasoningPack: resolveReasoningPackMode({
      config,
      cliOverride: parseReasoningPackMode(options.applyOptions.reasoningPack),
    }),
    externalDataConsent: options.applyOptions.externalDataConsent,
    onProgress: options.applyOptions.onProgress,
  };
  return synthesizeManagedPolicy(apply);
}
