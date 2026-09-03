import { classifyFiletype } from "../classify/classify";
import { SUGGESTION_KINDS } from "../domain/constants";
import type {
  FindingSuggestion,
  SuggestionKind,
  TokenRiskFinding,
} from "../domain/types";

const KIND_SET = new Set<string>(SUGGESTION_KINDS);

export function isSuggestionKind(value: string): value is SuggestionKind {
  return KIND_SET.has(value);
}

export function isFindingSuggestion(value: unknown): value is FindingSuggestion {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.kind === "string" &&
    isSuggestionKind(record.kind) &&
    typeof record.summary === "string" &&
    record.summary.trim().length > 0
  );
}

/**
 * Deterministic advice from reason + path class.
 * Lockfiles and generated trees stay exclude/ignore — never architecture.
 */
export function templateSuggestion(finding: TokenRiskFinding): FindingSuggestion {
  const fileClass = classifyFiletype(finding.path);

  // Must run before the generic `kept` → review fallback: duplicate_logic is
  // always `kept`, but its advice is consolidate (vocabulary only — #114).
  if (finding.reason === "duplicate_logic") {
    return {
      kind: "consolidate_duplicates",
      summary:
        "Another path implements this same behavior. Consolidate them behind one shared helper and update the callers. Excluding either file from agent context is not a fix — both are still imported. TokenForge does not apply this.",
    };
  }

  // Same placement rationale as duplicate_logic: always `kept`, but the
  // advice is dedupe, not the generic review fallback. Reuses `dedupe_rules`
  // rather than growing SUGGESTION_KINDS (#136).
  if (finding.reason === "redundant_config") {
    return {
      kind: "dedupe_rules",
      summary:
        "Another package repeats these settings. Extend one shared base config instead of copying it per package. Excluding a copy from agent context is not a fix — every package still loads its own at build time. TokenForge does not apply this.",
    };
  }

  if (finding.action === "kept") {
    return {
      kind: "review",
      summary:
        "Review this path before excluding it. TokenForge does not apply the change; savings are not counted until you decide.",
    };
  }

  if (fileClass === "lockfile") {
    return {
      kind: "exclude_from_context",
      summary:
        "Add this lockfile to the provider exclusion / ignore pack so Chat/Agent workflows do not ingest it. Do not rewrite application code.",
    };
  }

  if (fileClass === "generated") {
    return {
      kind: "exclude_from_context",
      summary:
        "Exclude this generated artifact from agent context (ignore pack / content exclusion). Do not edit or regenerate the build output by hand.",
    };
  }

  if (fileClass === "media") {
    return {
      kind: "exclude_from_context",
      summary:
        "Exclude this asset from agent context (ignore pack / content exclusion). Exclude the directory it lives in rather than the single file — asset trees are cheap individually and expensive together.",
    };
  }

  if (
    fileClass === "test_output" ||
    fileClass === "ci_log" ||
    fileClass === "build_artifact"
  ) {
    return {
      kind: "exclude_from_context",
      summary:
        "Exclude this output-shape artifact from agent context (ignore pack / content exclusion). Prefer compact test/lint summaries when you need signal.",
    };
  }

  switch (finding.reason) {
    case "inactive_tab":
      return {
        kind: "exclude_from_context",
        summary:
          "Filter this inactive tab from recommended context. TokenForge does not close the editor or edit the file.",
      };
    case "oversized":
      return {
        kind: "add_ignore",
        summary:
          "Add this oversized path to the agent ignore / exclusion list. Trim only if it is an instruction file you own — do not refactor product architecture.",
      };
    case "redundant_instructions":
      return {
        kind: "dedupe_rules",
        summary:
          "Keep one copy of the duplicated agent guidance and drop the rest. Do not change application architecture or public APIs.",
      };
    case "semantic_bloat":
      return {
        kind: "trim_instructions",
        summary:
          "Shorten this instruction or rules file to unique, high-signal bullets. Do not propose service rewrites or folder moves.",
      };
    case "low_signal_config":
      return {
        kind: "add_ignore",
        summary:
          "Exclude this low-signal config from Chat/Agent context, or replace it with a short pointer to the canonical doc. Do not redesign the product around this file.",
      };
    case "high_risk_filetype":
    default:
      return {
        kind: "exclude_from_context",
        summary:
          "Exclude this path from agent context via the provider policy pack. TokenForge will not apply a source-file edit.",
      };
  }
}

/** Prefer a persisted LLM suggestion; otherwise use the heuristic template. */
export function resolveSuggestion(finding: TokenRiskFinding): FindingSuggestion {
  if (isFindingSuggestion(finding.suggestion)) {
    return {
      kind: finding.suggestion.kind,
      summary: finding.suggestion.summary.trim(),
    };
  }
  return templateSuggestion(finding);
}
