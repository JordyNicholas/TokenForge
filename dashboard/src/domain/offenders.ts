import {
  classifyFiletype,
  type FiletypeRiskClass,
  type TokenRiskFinding,
  type TokenRiskReport,
} from "@tokenforge/risk-core";

export type FindingRow = TokenRiskFinding & {
  team: string;
  repo: string;
  fileClass: FiletypeRiskClass;
};

/** @deprecated Use FindingRow. Kept for existing imports. */
export type OffenderRow = FindingRow;

export type ClassBucket = {
  fileClass: FiletypeRiskClass;
  estTokens: number;
};

export function listFindings(
  reports: TokenRiskReport[],
  options: { includeKept?: boolean } = {},
): FindingRow[] {
  const includeKept = options.includeKept ?? true;
  const rows: FindingRow[] = [];
  for (const report of reports) {
    for (const finding of report.findings) {
      if (!includeKept && finding.action === "kept") {
        continue;
      }
      rows.push({
        ...finding,
        team: report.team,
        repo: report.repo,
        fileClass: classifyFiletype(finding.path),
      });
    }
  }
  rows.sort((a, b) => b.estTokens - a.estTokens || a.path.localeCompare(b.path));
  return rows;
}

export function topOffenders(
  reports: TokenRiskReport[],
  limit = 10,
): FindingRow[] {
  return listFindings(reports, { includeKept: false }).slice(0, limit);
}

export function tokensByFileClass(reports: TokenRiskReport[]): ClassBucket[] {
  const counts = new Map<FiletypeRiskClass, number>();
  for (const report of reports) {
    for (const finding of report.findings) {
      if (finding.action === "kept") {
        continue;
      }
      const fileClass = classifyFiletype(finding.path);
      counts.set(fileClass, (counts.get(fileClass) ?? 0) + finding.estTokens);
    }
  }
  return [...counts.entries()]
    .map(([fileClass, estTokens]) => ({ fileClass, estTokens }))
    .sort((a, b) => b.estTokens - a.estTokens);
}
