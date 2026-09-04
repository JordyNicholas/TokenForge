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
  /**
   * Fix-on actual billed Δ minus control actual billed Δ (USD).
   * Positive ⇒ Fix-on cohort saw a larger billed drop than control.
   * Null when there is no control cohort to compare.
   */
  relativeBilledDeltaUsd: number | null;
  /** One-line interpretive caption; still not a causation claim. */
  narrative: string;
};

export const COHORT_HONESTY_NOTE =
  "Fix-on vs control is billed usage compare for teams with vs without a Fix apply marker — not proof that TokenForge caused 100% of any invoice delta.";

function formatSignedUsd(value: number): string {
  const abs = Math.abs(value);
  const rounded = abs >= 100 ? abs.toFixed(0) : abs.toFixed(2);
  return `${value >= 0 ? "+" : "−"}$${rounded}`;
}

/**
 * Interpretive caption for Fix-on vs control billed Δ.
 * Keeps honesty: relative movement ≠ causal proof.
 */
export function cohortNarrative(compare: {
  hasFixOn: boolean;
  fixOn: Pick<CohortSummary, "teamCount" | "actualBilledChangeUsd">;
  control: Pick<CohortSummary, "teamCount" | "actualBilledChangeUsd">;
  relativeBilledDeltaUsd: number | null;
}): string {
  if (!compare.hasFixOn) {
    return "Load Fix change markers to partition Fix-on vs control teams.";
  }
  if (compare.control.teamCount === 0) {
    return "All tagged teams are Fix-on — no control cohort, so relative billed Δ is weak evidence.";
  }
  const relative = compare.relativeBilledDeltaUsd ?? 0;
  if (Math.abs(relative) < 0.005) {
    return `Fix-on and control billed Δ moved similarly (${formatSignedUsd(compare.fixOn.actualBilledChangeUsd)} vs ${formatSignedUsd(compare.control.actualBilledChangeUsd)}). Relative gap ≈ $0 — still not causation.`;
  }
  if (relative > 0) {
    return `Fix-on billed Δ outpaced control by ${formatSignedUsd(relative)} (${formatSignedUsd(compare.fixOn.actualBilledChangeUsd)} vs ${formatSignedUsd(compare.control.actualBilledChangeUsd)}). Suggestive, not proof TokenForge caused the invoice delta.`;
  }
  return `Control billed Δ outpaced Fix-on by ${formatSignedUsd(-relative)} (${formatSignedUsd(compare.control.actualBilledChangeUsd)} vs ${formatSignedUsd(compare.fixOn.actualBilledChangeUsd)}). Do not treat this as anti-proof — check periods, adoption, and waste applicability.`;
}

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

  const fixOn = summarizeCohort("fix", fixRows);
  const control = summarizeCohort("control", controlRows);
  const unknown = summarizeCohort("unknown", unknownRows);
  const hasFixOn = fixRows.length > 0;
  const relativeBilledDeltaUsd =
    hasFixOn && controlRows.length > 0
      ? fixOn.actualBilledChangeUsd - control.actualBilledChangeUsd
      : null;
  const draft = {
    hasFixOn,
    fixOn,
    control,
    relativeBilledDeltaUsd,
  };

  return {
    fixOn,
    control,
    unknown,
    hasFixOn,
    honestyNote: COHORT_HONESTY_NOTE,
    relativeBilledDeltaUsd,
    narrative: cohortNarrative(draft),
  };
}
