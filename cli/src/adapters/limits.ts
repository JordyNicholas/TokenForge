import {
  MAX_LEAN_INSTRUCTION_BYTES,
  collapseExclusionPaths,
  synthesizeLeanInstructions,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { RuntimeError } from "../app/errors";
import type { PolicyFile } from "./types";

/** @deprecated Prefer MAX_LEAN_INSTRUCTION_BYTES from risk-core. */
export const MAX_INSTRUCTION_BYTES = MAX_LEAN_INSTRUCTION_BYTES;

export const COPILOT_INSTRUCTIONS_PATH = ".github/copilot-instructions.md";
export const COPILOT_EXCLUSIONS_PATH = ".github/copilot-exclusion-candidates.yml";

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
  const lines = collapseExclusionPaths(
    report.findings
      .filter((finding) => finding.action === "excluded")
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
    contents: synthesizeLeanInstructions(report, {
      title,
      maxBytes: MAX_INSTRUCTION_BYTES,
    }),
  });
}
