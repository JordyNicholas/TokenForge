import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  annotateVarianceRow,
  buildProveSummaryMarkdown,
  buildVarianceBoard,
  compareCohorts,
  formatUsd,
  summarizeAssumptionsFreeze,
  type Assumptions,
  type CohortId,
  type VarianceBoardRow,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { CohortCompareCard } from "./CohortCompareCard";
import { DataTable } from "./DataTable";
import { EmptyState } from "./EmptyState";
import { GlossaryTip } from "./GlossaryTip";
import { KpiCard, KpiRow } from "./Kpi";
import { OverviewSection } from "./OverviewSection";
import { UsagePeriodPicker } from "./UsagePeriodPicker";

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;
}

const COHORT_LABEL: Record<CohortId, string> = {
  fix: "Fix-on",
  control: "Control",
  unknown: "—",
};

function VarianceRow({
  row,
  highlight,
  showCohort,
}: {
  row: VarianceBoardRow & { cohort?: CohortId };
  highlight?: boolean;
  showCohort: boolean;
}) {
  return (
    <TableRow selected={highlight} sx={highlight ? { bgcolor: "action.selected" } : undefined}>
      <TableCell sx={{ fontWeight: highlight ? 600 : 400 }}>{row.team}</TableCell>
      {showCohort ? (
        <TableCell>
          {row.cohort && row.cohort !== "unknown" ? (
            <Chip
              size="small"
              color={row.cohort === "fix" ? "primary" : "default"}
              variant="outlined"
              label={COHORT_LABEL[row.cohort]}
            />
          ) : (
            "—"
          )}
        </TableCell>
      ) : null}
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {row.incomplete ? "—" : formatUsd(row.baselineUsd)}
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {row.incomplete ? "—" : formatUsd(row.afterUsd)}
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {row.incomplete ? "—" : formatUsd(row.estimatedReductionUsd)}
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {row.incomplete ? "—" : signedUsd(row.actualBilledChangeUsd)}
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {row.incomplete ? "—" : signedUsd(row.varianceUsd)}
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {row.gapPercentLabel}
      </TableCell>
    </TableRow>
  );
}

export function VarianceBoardPanel({
  reports,
  assumptions,
  teamId,
}: {
  reports: TokenRiskReport[];
  assumptions: Assumptions;
  teamId: string | null;
}) {
  const {
    compareBaselineUsage,
    compareAfterUsage,
    compareAssumptionsFreeze,
    freezeCompareAssumptions,
    fixOnTeams,
    isDemoSource,
  } = useDashboard();
  const [copySnack, setCopySnack] = useState(false);

  if (!compareBaselineUsage) {
    return (
      <EmptyState
        title="Baseline usage needed"
        body="Import baseline billed usage from Source to open Variance."
      />
    );
  }

  if (!compareAfterUsage) {
    return (
      <EmptyState
        title="After-period usage needed"
        body="Import a second FinOps export (or usage-pull) for the post-Fix window."
      />
    );
  }

  const board = buildVarianceBoard({
    baselineUsage: compareBaselineUsage,
    afterUsage: compareAfterUsage,
    reports,
    liveAssumptions: assumptions,
    frozenAssumptions: compareAssumptionsFreeze,
  });

  const visibleRows = teamId
    ? board.rows.filter((row) => row.team === teamId)
    : board.rows;

  const focusBu = teamId ? board.rows.find((row) => row.team === teamId) ?? board.bu : board.bu;
  const fixSet = new Set(fixOnTeams);
  const showCohort = fixOnTeams.length > 0;
  const cohortCompare = compareCohorts(board, fixOnTeams);
  const annotatedRows = visibleRows.map((row) => annotateVarianceRow(row, fixSet));

  async function copyProveSummary(): Promise<void> {
    const warnParts: string[] = [];
    if (isDemoSource) {
      warnParts.push("demo data (not your team)");
    }
    if (!compareAssumptionsFreeze) {
      warnParts.push("Assumptions are not frozen");
    }
    if (warnParts.length > 0) {
      const proceed = window.confirm(
        `Prove summary uses ${warnParts.join(" and ")}. Copy anyway?`,
      );
      if (!proceed) {
        return;
      }
    }
    const markdown = buildProveSummaryMarkdown({
      board,
      fixOnTeams,
      assumptionsFrozen: compareAssumptionsFreeze,
    });
    await navigator.clipboard.writeText(markdown);
    setCopySnack(true);
  }

  return (
    <Stack spacing={2.5}>
      {cohortCompare.warnings.length > 0 ? (
        <Alert severity={cohortCompare.trustLevel === "none" ? "info" : "warning"}>
          {cohortCompare.warnings.join(" ")}
        </Alert>
      ) : null}
      <OverviewSection
        title="Period"
        titleAdornment={<GlossaryTip term="Variance" termId="variance" />}
      >
        <UsagePeriodPicker />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Typography variant="body2" color="text.secondary">
            {board.baselinePeriod} → {board.afterPeriod} · {board.providerLabel} ·{" "}
            {board.assumptionsFrozen ? "frozen" : "live"} Assumptions
            {board.periodMismatch || board.providerMismatch
              ? " · period/provider labels differ"
              : ""}
            {board.liveAssumptionsDrift ? " · live Assumptions drifted — re-freeze" : ""}
          </Typography>
          <Button size="small" variant="outlined" onClick={freezeCompareAssumptions}>
            {board.assumptionsFrozen ? "Re-freeze" : "Freeze Assumptions"}
          </Button>
          <Button size="small" variant="outlined" onClick={() => void copyProveSummary()}>
            Copy prove summary
          </Button>
        </Stack>
        {board.assumptionsFrozen ? (
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={summarizeAssumptionsFreeze(compareAssumptionsFreeze!)}
          />
        ) : null}
      </OverviewSection>

      <OverviewSection title="Prove KPIs">
        <CohortCompareCard board={board} />
        <KpiRow>
          <KpiCard
            label={teamId ? "Team · estimated reduction" : "BU · estimated reduction"}
            value={formatUsd(focusBu.estimatedReductionUsd)}
            hint="Scan × assumptions"
          />
          <KpiCard
            label="Actual billed change"
            value={signedUsd(focusBu.actualBilledChangeUsd)}
            hint="Baseline $ − after $"
          />
          <KpiCard
            label="Variance"
            value={signedUsd(focusBu.varianceUsd)}
            hint="Actual − estimated"
          />
          <KpiCard
            label="Gap"
            value={focusBu.gapPercentLabel}
            hint="% of estimated reduction"
          />
        </KpiRow>
      </OverviewSection>

      <OverviewSection title="Teams">
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell>Team</TableCell>
              {showCohort ? <TableCell>Cohort</TableCell> : null}
              <TableCell align="right">Baseline bill</TableCell>
              <TableCell align="right">After bill</TableCell>
              <TableCell align="right">Est. reduction</TableCell>
              <TableCell align="right">Actual Δ</TableCell>
              <TableCell align="right">Variance</TableCell>
              <TableCell align="right">Gap %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {annotatedRows.map((row) => (
              <VarianceRow
                key={row.team}
                row={row}
                highlight={teamId === row.team}
                showCohort={showCohort}
              />
            ))}
            {!teamId ? (
              <VarianceRow row={board.bu} highlight showCohort={showCohort} />
            ) : null}
          </TableBody>
        </DataTable>
      </OverviewSection>
      <Snackbar
        open={copySnack}
        autoHideDuration={4000}
        onClose={() => setCopySnack(false)}
        message="Prove summary copied (Markdown with honesty footer)"
      />
    </Stack>
  );
}
