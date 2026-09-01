import {
  MAX_LEAN_INSTRUCTION_BYTES,
  proposedExclusionPaths,
  proposedIgnorePaths,
  synthesizeLeanInstructions,
  type ProviderId,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { RuntimeError } from "../app/errors";
import { CLAUDE_EXCLUSIONS_PATH } from "./claude/claude";
import { CURSOR_EXCLUSIONS_PATH } from "./cursor/cursor";
import type { PolicyFile } from "./types";

/** @deprecated Prefer MAX_LEAN_INSTRUCTION_BYTES from risk-core. */
export const MAX_INSTRUCTION_BYTES = MAX_LEAN_INSTRUCTION_BYTES;

/**
 * Copilot conventional instruction path. Apply merges a TokenForge-managed
 * section into this file (#130) — never a silent full-file replace of user text.
 */
export const COPILOT_INSTRUCTIONS_PATH = ".github/copilot-instructions.md";
/** @deprecated Alias — same as {@link COPILOT_INSTRUCTIONS_PATH}. */
export const COPILOT_CANONICAL_INSTRUCTIONS_PATH = COPILOT_INSTRUCTIONS_PATH;
/** TokenForge-owned exclusion candidates (full overwrite is safe). */
export const COPILOT_EXCLUSIONS_PATH =
  ".github/tokenforge-copilot-exclusion-candidates.yml";

export const GENERIC_INSTRUCTIONS_PATH = ".github/tokenforge-instructions.md";
export const GENERIC_EXCLUSIONS_PATH = ".github/tokenforge-exclusions.yml";

/** Reject instruction files that would themselves bloat context. */
export function assertLeanInstruction(
  file: PolicyFile,
  maxBytes: number = MAX_INSTRUCTION_BYTES,
): PolicyFile {
  const bytes = Buffer.byteLength(file.contents, "utf8");
  if (bytes > maxBytes) {
    throw new RuntimeError(
      `${file.path} is ${bytes} bytes; policy files must stay under ${maxBytes}.`,
    );
  }
  return file;
}

export function exclusionPathForProvider(provider: ProviderId): string {
  if (provider === "copilot") {
    return COPILOT_EXCLUSIONS_PATH;
  }
  if (provider === "cursor") {
    return CURSOR_EXCLUSIONS_PATH;
  }
  if (provider === "claude") {
    return CLAUDE_EXCLUSIONS_PATH;
  }
  return GENERIC_EXCLUSIONS_PATH;
}

export function renderExclusionYaml(
  report: TokenRiskReport,
  headerLines: readonly string[],
): string {
  const lines = proposedExclusionPaths(report).map((path) => `  - ${path}`);

  return `${headerLines.join("\n")}
provider: ${report.provider}
repo: ${JSON.stringify(report.repo)}
paths:
${lines.join("\n") || "  []"}
`;
}

export function renderIgnoreCandidates(
  report: TokenRiskReport,
  headerLines: readonly string[],
): string {
  const patterns = proposedIgnorePaths(report);
  return [
    ...headerLines,
    "# Merge these into .cursorignore manually after review.",
    "# TokenForge never overwrites an existing .cursorignore.",
    `# provider: ${report.provider}`,
    `# repo: ${JSON.stringify(report.repo)}`,
    "",
    ...patterns,
    "",
  ].join("\n");
}

export function renderInstructionsFile(
  report: TokenRiskReport,
  path: string,
  title: string,
  options: {
    managedBody?: string;
    maxBytes?: number;
  } = {},
): PolicyFile {
  const maxBytes = options.maxBytes ?? MAX_INSTRUCTION_BYTES;
  const contents =
    options.managedBody ??
    synthesizeLeanInstructions(report, {
      title,
      maxBytes,
      completeSummaries: true,
    });
  return assertLeanInstruction(
    {
      path,
      writeMode: "merge-section",
      contents,
    },
    maxBytes,
  );
}
