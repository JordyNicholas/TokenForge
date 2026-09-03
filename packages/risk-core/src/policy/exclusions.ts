import type {
  FindingReason,
  TokenRiskFinding,
  TokenRiskReport,
} from "../domain/types";
import { resolveSuggestion } from "../advise/suggest";
import { classifyFiletype } from "../classify/classify";
import { activePathSet, isActivePath } from "./active";
import { collapseExclusionPaths, type CollapseOptions } from "./collapse";
import { isLlmExcludeSafe } from "./safety";

export type DiscoverOpportunityCategory = "policy_gap" | "session_kept";

export type DiscoverOpportunity = {
  path: string;
  reason: FindingReason;
  estTokens: number;
  category: DiscoverOpportunityCategory;
};

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

/**
 * Paths Fix would write into the provider exclusion YAML for this report.
 * Matches {@link renderExclusionYaml} / apply guards (excluded, not active).
 */
export function proposedExclusionPaths(
  report: Pick<TokenRiskReport, "findings" | "activePaths">,
  options: CollapseOptions = {},
): string[] {
  const active = activePathSet(report);
  const paths = report.findings
    .filter(
      (finding) =>
        finding.action === "excluded" && !isActivePath(active, finding.path),
    )
    .map((finding) => finding.path);
  return collapseExclusionPaths(paths, options);
}

const ADVISORY_IGNORE_REASONS = new Set<FindingReason>([
  "duplicate_logic",
  "redundant_config",
]);

function isSafeIgnoreCandidate(finding: TokenRiskFinding): boolean {
  if (ADVISORY_IGNORE_REASONS.has(finding.reason)) {
    return false;
  }
  if (finding.source === "llm" || finding.suggestion) {
    return isLlmExcludeSafe({
      path: finding.path,
      reason: finding.reason,
      fileClass: classifyFiletype(finding.path),
    });
  }
  return true;
}

/**
 * Paths Fix would suggest for `.cursorignore` (or provider equivalent).
 * Unions exclusion YAML paths with `add_ignore` suggestions; never includes
 * active session paths. LLM-suggested ignores use the same safety gate as excludes.
 */
export function proposedIgnorePaths(
  report: Pick<TokenRiskReport, "findings" | "activePaths">,
  options: CollapseOptions = {},
): string[] {
  const active = activePathSet(report);
  const fromExclusions = proposedExclusionPaths(report, options);
  const seen = new Set(fromExclusions);
  const extra: string[] = [];

  for (const finding of report.findings) {
    if (isActivePath(active, finding.path) || seen.has(finding.path)) {
      continue;
    }
    if (resolveSuggestion(finding).kind !== "add_ignore") {
      continue;
    }
    if (!isSafeIgnoreCandidate(finding)) {
      continue;
    }
    seen.add(finding.path);
    extra.push(finding.path);
  }

  return collapseExclusionPaths([...fromExclusions, ...extra], options);
}

/** True when `filePath` matches an applied exclusion entry (`dist/**` or exact). */
export function isPathCoveredByExclusion(
  filePath: string,
  patterns: readonly string[],
): boolean {
  const path = normalizePath(filePath);
  for (const raw of patterns) {
    const pattern = normalizePath(raw);
    if (pattern.endsWith("/**")) {
      const dir = pattern.slice(0, -3);
      if (path === dir || path.startsWith(`${dir}/`)) {
        return true;
      }
      continue;
    }
    if (path === pattern) {
      return true;
    }
  }
  return false;
}

function toOpportunity(
  finding: TokenRiskFinding,
  category: DiscoverOpportunityCategory,
): DiscoverOpportunity {
  return {
    path: finding.path,
    reason: finding.reason,
    estTokens: finding.estTokens,
    category,
  };
}

/**
 * Missed savings the user has not captured yet — RTK-inspired discover (#170).
 *
 * - `policy_gap`: scan says exclude, but on-disk exclusion YAML does not cover the path
 * - `session_kept`: at-risk path still kept in the extension session (not Filtered)
 */
export function discoverMissedOpportunities(
  report: TokenRiskReport,
  appliedExclusionPatterns: readonly string[],
): DiscoverOpportunity[] {
  const active = activePathSet(report);
  const opportunities: DiscoverOpportunity[] = [];

  for (const finding of report.findings) {
    if (finding.action === "kept") {
      opportunities.push(toOpportunity(finding, "session_kept"));
      continue;
    }
    if (
      finding.action === "excluded" &&
      !isActivePath(active, finding.path) &&
      !isPathCoveredByExclusion(finding.path, appliedExclusionPatterns)
    ) {
      opportunities.push(toOpportunity(finding, "policy_gap"));
    }
  }

  return opportunities.sort(
    (a, b) =>
      b.estTokens - a.estTokens ||
      a.path.localeCompare(b.path) ||
      a.category.localeCompare(b.category),
  );
}

export function missedOpportunityTokens(
  opportunities: readonly DiscoverOpportunity[],
): number {
  return opportunities.reduce((sum, row) => sum + row.estTokens, 0);
}
