import {
  MAX_ANALYSIS_OVERVIEW_CAVEAT_CHARS,
  MAX_ANALYSIS_OVERVIEW_CAVEATS,
  MAX_ANALYSIS_OVERVIEW_SUMMARY_CHARS,
  MAX_ANALYSIS_OVERVIEW_THEME_CHARS,
  MAX_ANALYSIS_OVERVIEW_THEMES,
} from "../domain/constants";
import type { LlmAnalysisOverview } from "../domain/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clip(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function parseStringList(
  value: unknown,
  maxItems: number,
  maxItemChars: number,
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const next = clip(entry, maxItemChars);
    if (next.length === 0 || seen.has(next)) {
      continue;
    }
    seen.add(next);
    items.push(next);
    if (items.length >= maxItems) {
      break;
    }
  }
  return items.length > 0 ? items : undefined;
}

/** Normalize unknown JSON into a bounded overview, or `undefined` if unusable. */
export function parseLlmAnalysisOverview(
  value: unknown,
): LlmAnalysisOverview | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.summary !== "string") {
    return undefined;
  }
  const summary = clip(value.summary, MAX_ANALYSIS_OVERVIEW_SUMMARY_CHARS);
  if (summary.length === 0) {
    return undefined;
  }

  const overview: LlmAnalysisOverview = { summary };
  const themes = parseStringList(
    value.themes,
    MAX_ANALYSIS_OVERVIEW_THEMES,
    MAX_ANALYSIS_OVERVIEW_THEME_CHARS,
  );
  if (themes) {
    overview.themes = themes;
  }
  const caveats = parseStringList(
    value.caveats,
    MAX_ANALYSIS_OVERVIEW_CAVEATS,
    MAX_ANALYSIS_OVERVIEW_CAVEAT_CHARS,
  );
  if (caveats) {
    overview.caveats = caveats;
  }
  return overview;
}

export function isLlmAnalysisOverview(
  value: unknown,
): value is LlmAnalysisOverview {
  return parseLlmAnalysisOverview(value) !== undefined;
}
