import {
  classifyFiletype,
  type FiletypeRiskClass,
  type TokenRiskFinding,
  type TokenRiskReport,
} from "@tokenforge/risk-core";

export type OffenderRow = TokenRiskFinding & {
  team: string;
  repo: string;
  fileClass: FiletypeRiskClass;
};

export type ClassBucket = {
  fileClass: FiletypeRiskClass;
  estTokens: number;
};

export function topOffenders(
  reports: TokenRiskReport[],
  limit = 10,
): OffenderRow[] {
  const rows: OffenderRow[] = [];
  for (const report of reports) {
    for (const finding of report.findings) {
      if (finding.action === "kept") {
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
  rows.sort((a, b) => b.estTokens - a.estTokens);
  return rows.slice(0, limit);
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
