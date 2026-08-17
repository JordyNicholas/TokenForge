import { RuntimeError } from "../app/errors";
import type { PolicyFile } from "./types";

/** Hard cap so policy packs cannot become another fat always-on context file. */
export const MAX_INSTRUCTION_BYTES = 2_048;

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
