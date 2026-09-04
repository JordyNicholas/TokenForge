/**
 * Director-forwardable Prove Markdown from dashboard Variance state.
 * Mirrors CLI prove-report honesty — estimated ≠ billed causation.
 */
import type { Assumptions } from "./assumptions";
import { summarizeAssumptionsFreeze } from "./assumptions";
import {
  COHORT_HONESTY_NOTE,
  compareCohorts,
  type CohortCompare,
} from "./cohortCompare";
import { formatUsd } from "./format";
import type { VarianceBoard } from "./varianceBoard";

const HONESTY_FOOTER = `${COHORT_HONESTY_NOTE}

Estimated avoided context is **not** an invoice causation claim. Cohort Fix-on vs control reduces noise; it does not prove 100% of any billed delta was caused by TokenForge.

---
_Local-first TokenForge Prove — forward this Markdown to FinOps._`;

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;
}

function cohortSection(compare: CohortCompare): string {
  if (!compare.hasFixOn) {
    return `_No Fix change markers loaded — cohort compare unavailable._`;
  }
  const lines = [
    `- Fix-on teams (${compare.fixOn.teamCount}): ${compare.fixOn.teams.join(", ") || "—"}`,
    `- Control teams (${compare.control.teamCount}): ${compare.control.teams.join(", ") || "—"}`,
    `- Fix-on billed Δ: ${signedUsd(compare.fixOn.actualBilledChangeUsd)}`,
    `- Control billed Δ: ${
      compare.control.teamCount > 0
        ? signedUsd(compare.control.actualBilledChangeUsd)
        : "— (no control)"
    }`,
    `- Fix-on vs control: ${
      compare.relativeBilledDeltaUsd !== null
        ? signedUsd(compare.relativeBilledDeltaUsd)
        : "— (weak evidence — no control cohort)"
    }`,
    `- Trust: **${compare.trustLevel}** — ${compare.narrative}`,
  ];
  if (compare.warnings.length > 0) {
    lines.push("", "**Warnings:**", ...compare.warnings.map((w) => `- ${w}`));
  }
  return lines.join("\n");
}

export type ProveSummaryInput = {
  board: VarianceBoard;
  fixOnTeams: readonly string[];
  assumptionsFrozen: Assumptions | null;
  generatedAt?: string;
};

/** Build Markdown Prove summary for Variance export / clipboard. */
export function buildProveSummaryMarkdown(input: ProveSummaryInput): string {
  const { board, fixOnTeams, assumptionsFrozen } = input;
  const compare = compareCohorts(board, fixOnTeams);
  const bu = board.bu;
  const freezeLabel = board.assumptionsFrozen && assumptionsFrozen
    ? summarizeAssumptionsFreeze(assumptionsFrozen)
    : board.assumptionsFrozen
      ? "frozen"
      : "live (not frozen — re-freeze before sharing)";

  return `# TokenForge Prove summary

Generated: ${input.generatedAt ?? new Date().toISOString()}  
Period: **${board.baselinePeriod} → ${board.afterPeriod}** · ${board.providerLabel}  
Assumptions: **${freezeLabel}**

## BU variance

| Metric | Value |
| --- | --- |
| Estimated reduction | ${formatUsd(bu.estimatedReductionUsd)} |
| Actual billed change | ${signedUsd(bu.actualBilledChangeUsd)} |
| Variance | ${signedUsd(bu.varianceUsd)} |
| Gap | ${bu.gapPercentLabel} |

## Cohort compare (Fix-on vs control)

${cohortSection(compare)}

## Teams

| Team | Est. reduction | Actual Δ | Variance | Gap |
| --- | --- | --- | --- | --- |
${board.rows
  .map(
    (row) =>
      `| ${row.team} | ${row.incomplete ? "—" : formatUsd(row.estimatedReductionUsd)} | ${row.incomplete ? "—" : signedUsd(row.actualBilledChangeUsd)} | ${row.incomplete ? "—" : signedUsd(row.varianceUsd)} | ${row.gapPercentLabel} |`,
  )
  .join("\n")}

## Honesty

${HONESTY_FOOTER}
`;
}
