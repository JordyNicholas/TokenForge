import {
  isInstructionPath,
  parseApplyMode,
  resolvePolicyMaxBytes,
  type ApplyMode,
  type DirectoryRoleAssignment,
  type ReasoningPackMode,
  type StackProfile,
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
  /** Instruction path this run merges into; read for persona detection (F26). */
  instructionPath?: string;
  stackProfile?: StackProfile;
  directoryRoles?: readonly DirectoryRoleAssignment[];
  reasoningPack?: ReasoningPackMode;
  /** Table is delivered as scoped rule files, so render the persona only. */
  scopedTable?: boolean;
  externalDataConsent?: boolean;
  onProgress?: (message: string) => void;
  /** Optional preloaded bodies; when omitted, loads from report instruction paths. */
  instructionContents?: ReadonlyMap<string, string>;
};

export async function loadInstructionContentsForPolicy(
  root: string,
  report: TokenRiskReport,
  targetInstructionPath?: string,
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  const paths = new Set<string>();
  // The file this run is about to merge into is exactly the one whose persona
  // a new one would collide with, and a small, clean instruction file is never
  // in `findings` - so scan output alone would miss the common case (F26 S7).
  if (targetInstructionPath !== undefined) {
    paths.add(targetInstructionPath);
  }
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
    (await loadInstructionContentsForPolicy(
      options.root,
      options.report,
      options.instructionPath,
    ));

  const baseInput = {
    report: options.report,
    title: options.title,
    maxBytes,
    config: options.config,
    instructionContents,
    keepDirs: options.keepDirs,
    sourceRoots: options.sourceRoots,
    stackProfile: options.stackProfile,
    directoryRoles: options.directoryRoles,
    reasoningPack: options.reasoningPack,
    scopedTable: options.scopedTable,
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
      sampleFileContents: await loadSampleFileContents({
        root: options.root,
        directoryRoles: options.directoryRoles,
        backend: spec.backend,
        externalDataConsent: options.externalDataConsent,
        onProgress: options.onProgress,
      }),
    },
    runner,
  );
}

/** Backends that run on the machine, so repo content never leaves it. */
const LOCAL_POLICY_BACKENDS: ReadonlySet<string> = new Set(["noop", "ollama"]);

/**
 * Whether this run may put repository source in the refinement prompt.
 *
 * The per-backend runners already refuse to call a vendor without consent, so
 * this is the second lock rather than the only one - but it is the one that
 * decides whether the bytes are ever read off disk and assembled into a prompt
 * at all, which is the difference between "not sent" and "not collected".
 */
export function mayReadSampleFiles(
  backend: string,
  externalDataConsent: boolean | undefined,
): boolean {
  return LOCAL_POLICY_BACKENDS.has(backend) || externalDataConsent === true;
}

/**
 * Sample file bodies for the refinement prompt, or nothing.
 *
 * This is the only part of F26 that would put repository *source* in front of a
 * vendor model, so it is gated the same way the enrichers are: local backends
 * read freely, everything else needs `--allow-external`. Without consent the
 * refinement still runs - the model just judges from paths and role names, and
 * the deterministic rules remain the floor either way.
 */
async function loadSampleFileContents(options: {
  root: string;
  directoryRoles?: readonly DirectoryRoleAssignment[];
  backend: string;
  externalDataConsent?: boolean;
  onProgress?: (message: string) => void;
}): Promise<Map<string, string> | undefined> {
  const roles = options.directoryRoles ?? [];
  if (roles.length === 0) {
    return undefined;
  }
  if (!mayReadSampleFiles(options.backend, options.externalDataConsent)) {
    options.onProgress?.(
      `Policy synthesizer: --allow-external not set — sending role names to ${options.backend} without file contents.`,
    );
    return undefined;
  }

  const contents = new Map<string, string>();
  for (const role of roles) {
    for (const path of role.sampleFiles) {
      try {
        contents.set(path, await readFile(join(options.root, path), "utf8"));
      } catch {
        // An unreadable sample is one less example, not a failed run.
      }
    }
  }
  return contents;
}
