/**
 * Org/team repo adoption rollup for Prove (#174).
 * Compares scanned teams on the board vs teams with Fix apply markers.
 */
import type { TokenRiskReport } from "@tokenforge/risk-core";

export const ADOPTION_UNAVAILABLE = "Not available";

export type RepoCoverageMetrics = {
  totalTeams: number;
  teamsWithScan: number;
  teamsWithApplyMarker: number;
  scanCoveragePercent: number | null;
  applyCoveragePercent: number | null;
};

export const ADOPTION_HONESTY_NOTE =
  "Measures TokenForge scan and Fix apply coverage on loaded reports — not vendor agent usage or billing APIs.";

export function computeRepoCoverage(
  reports: readonly TokenRiskReport[],
  fixOnTeams: readonly string[],
): RepoCoverageMetrics {
  const teams = [...new Set(reports.map((report) => report.team))].sort((a, b) =>
    a.localeCompare(b),
  );
  const totalTeams = teams.length;
  const fixSet = new Set(fixOnTeams);
  const teamsWithApplyMarker = teams.filter((team) => fixSet.has(team)).length;

  return {
    totalTeams,
    teamsWithScan: totalTeams,
    teamsWithApplyMarker,
    scanCoveragePercent: totalTeams > 0 ? 100 : null,
    applyCoveragePercent:
      fixOnTeams.length > 0 && totalTeams > 0
        ? Math.round((teamsWithApplyMarker / totalTeams) * 100)
        : null,
  };
}

export function formatCoverageLabel(covered: number, total: number): string {
  return `${covered}/${total} teams`;
}
