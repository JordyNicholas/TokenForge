import type { ContextIndexRecommendation } from "../domain/types";

const MAX_RECOMMENDATIONS = 8;
const MAX_PURPOSE_CHARS = 120;
const MAX_SUMMARY_CHARS = 400;

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

/** Markdown index paths only — not ordinary source/config finding paths (#189). */
export function isContextIndexPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/").trim();
  if (normalized.length === 0 || normalized.includes("..")) {
    return false;
  }
  const lower = normalized.toLowerCase();
  if (!lower.endsWith(".md") || lower.endsWith(".mdc")) {
    return false;
  }
  return !/\.(ts|tsx|js|jsx|json|yml|yaml|lock)$/.test(lower);
}

/** Normalize unknown JSON into bounded context-index recommendations. */
export function parseContextIndexRecommendations(
  value: unknown,
): ContextIndexRecommendation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: ContextIndexRecommendation[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    if (typeof entry.path !== "string" || typeof entry.purpose !== "string") {
      continue;
    }
    if (typeof entry.summary !== "string") {
      continue;
    }
    const path = entry.path.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!isContextIndexPath(path) || seen.has(path)) {
      continue;
    }
    const purpose = clip(entry.purpose, MAX_PURPOSE_CHARS);
    const summary = clip(entry.summary, MAX_SUMMARY_CHARS);
    if (purpose.length === 0 || summary.length === 0) {
      continue;
    }
    seen.add(path);
    items.push({ path, purpose, summary });
    if (items.length >= MAX_RECOMMENDATIONS) {
      break;
    }
  }
  return items;
}

export function isContextIndexRecommendation(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.path === "string" &&
    typeof value.purpose === "string" &&
    typeof value.summary === "string" &&
    value.purpose.length > 0 &&
    value.summary.length > 0 &&
    isContextIndexPath(value.path)
  );
}

export function isRepoAuditCoverage(value: unknown): value is import("../domain/types").RepoAuditCoverage {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.mode === "codex_repo_audit" &&
    typeof value.filesCopied === "number" &&
    Number.isInteger(value.filesCopied) &&
    value.filesCopied >= 0 &&
    typeof value.filesSkippedSecret === "number" &&
    Number.isInteger(value.filesSkippedSecret) &&
    value.filesSkippedSecret >= 0 &&
    typeof value.filesSkippedHardDir === "number" &&
    Number.isInteger(value.filesSkippedHardDir) &&
    value.filesSkippedHardDir >= 0 &&
    typeof value.bytesCopied === "number" &&
    Number.isInteger(value.bytesCopied) &&
    value.bytesCopied >= 0
  );
}
