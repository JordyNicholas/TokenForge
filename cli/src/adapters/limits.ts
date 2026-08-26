import {
  MAX_LEAN_INSTRUCTION_BYTES,
  activePathSet,
  collapseExclusionPaths,
  isActivePath,
  synthesizeLeanInstructions,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { RuntimeError } from "../app/errors";
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
export function assertLeanInstruction(file: PolicyFile): PolicyFile {
  const bytes = Buffer.byteLength(file.contents, "utf8");
  if (bytes > MAX_INSTRUCTION_BYTES) {
    throw new RuntimeError(
      `${file.path} is ${bytes} bytes; policy files must stay under ${MAX_INSTRUCTION_BYTES}.`,
    );
  }
  return file;
}

export function renderExclusionYaml(
  report: TokenRiskReport,
  headerLines: readonly string[],
): string {
  // Second guard, not a redundant one: scan already downgrades an active
  // path's action to `kept`, but this file is a durable policy artifact and
  // the report reaching it may predate that flag or have been hand-edited.
  const active = activePathSet(report);
  const lines = collapseExclusionPaths(
    report.findings
      .filter(
        (finding) =>
          finding.action === "excluded" && !isActivePath(active, finding.path),
      )
      .map((finding) => finding.path),
  ).map((path) => `  - ${path}`);

  return `${headerLines.join("\n")}
provider: ${report.provider}
repo: ${JSON.stringify(report.repo)}
paths:
${lines.join("\n") || "  []"}
`;
}

export function renderInstructionsFile(
  report: TokenRiskReport,
  path: string,
  title: string,
): PolicyFile {
  return assertLeanInstruction({
    path,
    writeMode: "merge-section",
    contents: synthesizeLeanInstructions(report, {
      title,
      maxBytes: MAX_INSTRUCTION_BYTES,
    }),
  });
}
