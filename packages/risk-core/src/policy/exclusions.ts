import type {
  FindingReason,
  TokenRiskFinding,
  TokenRiskReport,
} from "../domain/types";
import { activePathSet, isActivePath } from "./active";
import { collapseExclusionPaths } from "./collapse";

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
): string[] {
  const active = activePathSet(report);
  const paths = report.findings
    .filter(
      (finding) =>
        finding.action === "excluded" && !isActivePath(active, finding.path),
    )
    .map((finding) => finding.path);
  return collapseExclusionPaths(paths);
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
