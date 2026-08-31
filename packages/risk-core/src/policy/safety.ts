import { isInstructionPath } from "../candidates/candidates";
import { classifyFiletype } from "../classify/classify";
import { protectionFor } from "../protect/protect";
import type { FiletypeRiskClass, FindingReason } from "../domain/types";

/** Reasons an LLM may recommend excluding a path from agent context. */
const LLM_EXCLUDABLE_REASONS = new Set<FindingReason>([
  "semantic_bloat",
  "redundant_instructions",
  "low_signal_config",
]);

const INSTRUCTION_RULE_SUFFIXES = [".mdc", ".md"];

function isInstructionRulesFile(path: string): boolean {
  if (isInstructionPath(path)) {
    return true;
  }
  const lower = path.replaceAll("\\", "/").toLowerCase();
  return INSTRUCTION_RULE_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

export type LlmVerdict = "exclude" | "review" | "keep";

/**
 * Whether an LLM `exclude` verdict is safe to map to `action: excluded`.
 * Downgrade to `review` when exclusion could harm repo correctness.
 *
 * See `docs/design/COMPLEMENTARY_HYBRID_SCAN.md` — policy safety invariants.
 */
export function isLlmExcludeSafe(input: {
  path: string;
  reason: FindingReason;
  fileClass?: FiletypeRiskClass;
}): boolean {
  const fileClass = input.fileClass ?? classifyFiletype(input.path);
  const protection = protectionFor(input.path);

  if (
    protection?.suppresses.includes("oversized") ||
    protection?.suppresses.includes("high_risk_filetype")
  ) {
    return false;
  }

  if (!LLM_EXCLUDABLE_REASONS.has(input.reason)) {
    return false;
  }

  if (fileClass === "source" && !isInstructionRulesFile(input.path)) {
    return false;
  }

  return true;
}

/**
 * Coerce an LLM verdict when `exclude` would violate policy safety invariants.
 */
export function coerceLlmVerdict(input: {
  path: string;
  reason: FindingReason;
  verdict: LlmVerdict;
  fileClass?: FiletypeRiskClass;
}): LlmVerdict {
  if (input.verdict !== "exclude") {
    return input.verdict;
  }
  return isLlmExcludeSafe(input) ? "exclude" : "review";
}
