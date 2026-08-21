import type { TokenRiskReport } from "@tokenforge/risk-core";

/** Estate style for board-facing Prove (seed metadata, not risk-core). */
export type ArchitectureStyle =
  | "monolith"
  | "microservices"
  | "serverless"
  | "data-platform";

export const ARCHITECTURE_LABELS: Record<ArchitectureStyle, string> = {
  monolith: "Monolith",
  microservices: "Microservices",
  serverless: "Serverless",
  "data-platform": "Data platform",
};

const STYLES = new Set<string>(Object.keys(ARCHITECTURE_LABELS));

export function isArchitectureStyle(value: string): value is ArchitectureStyle {
  return STYLES.has(value);
}

export type ArchitectureBucket = {
  architecture: ArchitectureStyle;
  label: string;
  teams: number;
  beforeTokens: number;
  savedTokens: number;
};

/** Roll up scan totals by architecture tag (unknown teams omitted). */
export function tokensByArchitecture(
  reports: readonly TokenRiskReport[],
  architectures: Readonly<Record<string, ArchitectureStyle>> | undefined,
): ArchitectureBucket[] {
  if (!architectures) {
    return [];
  }
  const map = new Map<ArchitectureStyle, ArchitectureBucket>();
  for (const report of reports) {
    const style = architectures[report.team];
    if (!style) {
      continue;
    }
    const current = map.get(style) ?? {
      architecture: style,
      label: ARCHITECTURE_LABELS[style],
      teams: 0,
      beforeTokens: 0,
      savedTokens: 0,
    };
    current.teams += 1;
    current.beforeTokens += report.totals.beforeTokens;
    current.savedTokens += report.totals.savedTokens;
    map.set(style, current);
  }
  return [...map.values()].sort((a, b) => b.savedTokens - a.savedTokens);
}

export function architectureForTeam(
  team: string,
  architectures: Readonly<Record<string, ArchitectureStyle>> | undefined,
): ArchitectureStyle | undefined {
  return architectures?.[team];
}
