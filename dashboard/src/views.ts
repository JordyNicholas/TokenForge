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

/** Teal (low waste) → red (high waste). */
export function heatColor(percent: number): string {
  const t = Math.min(100, Math.max(0, percent)) / 100;
  const hue = 162 - t * 162;
  const light = 14 + t * 26;
  return `hsl(${hue} 62% ${light}%)`;
}
