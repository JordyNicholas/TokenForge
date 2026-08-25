/**
 * Fix-on vs control cohort compare for Prove (#96).
 * Uses Prove change markers (or an explicit team list) to partition variance rows —
 * not a claim that invoice delta is 100% TokenForge-caused.
 */
import type { ProveChangeMarker } from "@tokenforge/risk-core";
import { formatGapPercent, varianceGapPercent } from "./varianceGap";
import type { VarianceBoard, VarianceBoardRow } from "./varianceBoard";

export type CohortId = "fix" | "control" | "unknown";

export type CohortSummary = {
  cohort: CohortId;
  teamCount: number;
  teams: string[];
  baselineUsd: number;
  afterUsd: number;
  estimatedReductionUsd: number;
  actualBilledChangeUsd: number;
  varianceUsd: number;
  gapPercent: number | null;
  gapPercentLabel: string;
};

export type CohortCompare = {
  fixOn: CohortSummary;
  control: CohortSummary;
  unknown: CohortSummary;
  /** True when at least one Fix-on team is tagged. */
  hasFixOn: boolean;
  honestyNote: string;
};

export const COHORT_HONESTY_NOTE =
  "Fix-on vs control is billed usage compare for teams with vs without a Fix apply marker — not proof that TokenForge caused 100% of any invoice delta.";

/** Teams tagged by apply/org-pack Prove change markers. */
export function fixOnTeamsFromMarkers(
  markers: readonly ProveChangeMarker[],
): string[] {
  const teams = new Set<string>();
  for (const marker of markers) {
    if (marker.team) {
      teams.add(marker.team);
    }
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}

export function cohortForTeam(
  team: string,
  fixOnTeams: ReadonlySet<string>,
): CohortId {
  if (fixOnTeams.size === 0) {
    return "unknown";
  }
  return fixOnTeams.has(team) ? "fix" : "control";
}

export function annotateVarianceRow(
  row: VarianceBoardRow,
  fixOnTeams: ReadonlySet<string>,
): VarianceBoardRow & { cohort: CohortId } {
  return { ...row, cohort: cohortForTeam(row.team, fixOnTeams) };
}

function emptySummary(cohort: CohortId): CohortSummary {
  return {
    cohort,
    teamCount: 0,
    teams: [],
    baselineUsd: 0,
    afterUsd: 0,
    estimatedReductionUsd: 0,
    actualBilledChangeUsd: 0,
    varianceUsd: 0,
    gapPercent: null,
    gapPercentLabel: "—",
  };
}

function summarizeCohort(
  cohort: CohortId,
  rows: VarianceBoardRow[],
): CohortSummary {
  if (rows.length === 0) {
    return emptySummary(cohort);
  }
  const complete = rows.filter((row) => !row.incomplete);
  const baselineUsd = complete.reduce((sum, row) => sum + row.baselineUsd, 0);
  const afterUsd = complete.reduce((sum, row) => sum + row.afterUsd, 0);
  const estimatedReductionUsd = complete.reduce(
    (sum, row) => sum + row.estimatedReductionUsd,
    0,
  );
  const actualBilledChangeUsd = complete.reduce(
    (sum, row) => sum + row.actualBilledChangeUsd,
    0,
  );
  const varianceUsd = actualBilledChangeUsd - estimatedReductionUsd;
  const gapPercent = varianceGapPercent(varianceUsd, estimatedReductionUsd);
  return {
    cohort,
    teamCount: rows.length,
    teams: rows.map((row) => row.team),
    baselineUsd,
    afterUsd,
    estimatedReductionUsd,
    actualBilledChangeUsd,
    varianceUsd,
    gapPercent,
    gapPercentLabel: formatGapPercent(gapPercent),
  };
}

/**
 * Partition a variance board into Fix-on vs control cohorts.
 * Teams without a marker are control when any Fix-on team exists.
 */
export function compareCohorts(
  board: VarianceBoard,
  fixOnTeams: readonly string[],
): CohortCompare {
  const fixSet = new Set(fixOnTeams);
  const fixRows: VarianceBoardRow[] = [];
  const controlRows: VarianceBoardRow[] = [];
  const unknownRows: VarianceBoardRow[] = [];

  for (const row of board.rows) {
    const cohort = cohortForTeam(row.team, fixSet);
    if (cohort === "fix") {
      fixRows.push(row);
    } else if (cohort === "control") {
      controlRows.push(row);
    } else {
      unknownRows.push(row);
    }
  }

  return {
    fixOn: summarizeCohort("fix", fixRows),
    control: summarizeCohort("control", controlRows),
    unknown: summarizeCohort("unknown", unknownRows),
    hasFixOn: fixRows.length > 0,
    honestyNote: COHORT_HONESTY_NOTE,
  };
}
