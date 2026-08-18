import type { FindingAction, FindingSource, SuggestionKind } from "@tokenforge/risk-core";

export const SOURCE_LABELS: Record<FindingSource, string> = {
  heuristic: "Heuristic",
  llm: "LLM",
  combined: "Combined",
};

export const ACTION_LABELS: Record<FindingAction, string> = {
  excluded: "Excluded",
  filtered: "Filtered",
  kept: "Review · not counted",
};

export const SUGGESTION_KIND_LABELS: Record<SuggestionKind, string> = {
  exclude_from_context: "Exclude from context",
  trim_instructions: "Trim instructions",
  dedupe_rules: "Dedupe rules",
  add_ignore: "Add ignore",
  review: "Review",
};
