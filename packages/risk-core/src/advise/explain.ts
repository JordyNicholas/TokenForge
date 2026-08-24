import { classifyFiletype } from "../classify/classify";
import type {
  FiletypeRiskClass,
  FindingReason,
  TokenRiskFinding,
} from "../domain/types";

export type FindingExplanation = {
  /** Deterministic copy from reason + path class. Always present. */
  explanation: string;
  /** LLM `detail` when the hybrid pass provided one. */
  detail?: string;
};

function classPhrase(fileClass: FiletypeRiskClass): string {
  switch (fileClass) {
    case "lockfile":
      return "lockfile";
    case "generated":
      return "generated build artifact";
    case "config":
      return "config file";
    case "source":
      return "source file";
    default:
      return "path";
  }
}

function heuristicExplanation(
  reason: FindingReason,
  fileClass: FiletypeRiskClass,
): string {
  switch (reason) {
    case "inactive_tab":
      return "This path was inactive long enough to flag as stale context (10 minutes when focused, 5 minutes in a background tab). Keeping it in Chat/Agent context still consumes billable tokens while it is unlikely to be the file being edited.";
    case "high_risk_filetype":
      if (fileClass === "lockfile") {
        return "Lockfiles are high-volume, low-signal context for coding agents. Excluding them from Chat/Agent workflows is the usual Fix.";
      }
      if (fileClass === "generated") {
        return "Generated build artifacts rarely help an agent and inflate token usage.";
      }
      return `This ${classPhrase(fileClass)} is in a high-risk filetype class for agent context waste.`;
    case "oversized":
      return `This ${classPhrase(fileClass)} is large enough that including it in agent context is expensive relative to its likely value.`;
    case "semantic_bloat":
      return "The hybrid pass flagged this path as semantically bulky for Chat/Agent context — high token cost, low unique signal.";
    case "redundant_instructions":
      return "Agent instructions here likely duplicate guidance already present in the repo.";
    case "low_signal_config":
      return "This config looks like low-signal context: billable tokens without much help for the agent.";
    case "duplicate_logic":
      return "The hybrid pass found another path implementing the same behavior as this one. Two copies of the same logic cost tokens twice and drift apart over time — but excluding either from context is not the fix, since both are still imported.";
  }
}

/**
 * Explain a finding without calling a model.
 * Heuristic reports get template copy; LLM `detail` is attached when present.
 */
export function explainFinding(finding: TokenRiskFinding): FindingExplanation {
  const fileClass = classifyFiletype(finding.path);
  const explanation = heuristicExplanation(finding.reason, fileClass);
  const detail = finding.detail?.trim();
  return detail && detail.length > 0 ? { explanation, detail } : { explanation };
}
