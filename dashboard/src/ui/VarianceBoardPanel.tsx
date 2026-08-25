import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  buildVarianceBoard,
  formatUsd,
  summarizeAssumptionsFreeze,
  type Assumptions,
  type VarianceBoardRow,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { DataTable } from "./DataTable";
import { CohortCompareCard } from "./CohortCompareCard";
import { KpiCard, KpiRow } from "./Kpi";
import { UsagePeriodPicker } from "./UsagePeriodPicker";

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;
}

function VarianceRow({
  row,
  highlight,
}: {
  row: VarianceBoardRow;
  highlight?: boolean;
}) {
  return (
    <TableRow selected={highlight} sx={highlight ? { bgcolor: "action.selected" } : undefined}>
      <TableCell sx={{ fontWeight: highlight ? 600 : 400 }}>{row.team}</TableCell>
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
  } = useDashboard();

  if (!compareBaselineUsage) {
    return (
      <Alert severity="info" variant="outlined">
        Load or import baseline billed usage to open the variance board.
      </Alert>
    );
  }

  if (!compareAfterUsage) {
    return (
      <Alert severity="info" variant="outlined">
        <AlertTitle>After-period usage needed</AlertTitle>
        Import a second FinOps export or run{" "}
        <code>tokenforge usage-pull</code> for the post-Fix billing window. Billed usage
        compare — not agent pipeline metering.
      </Alert>
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

  return (
    <>
      <UsagePeriodPicker />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 1 }}
      >
        <Typography variant="body2" color="text.secondary">
          {board.baselinePeriod} → {board.afterPeriod} · {board.providerLabel}. Estimated $
          uses {board.assumptionsFrozen ? "frozen" : "live"} Assumptions × each team&apos;s
          baseline scan. Billed usage compare — not agent pipeline metering.
        </Typography>
        <Button size="small" variant="outlined" onClick={freezeCompareAssumptions}>
          {board.assumptionsFrozen ? "Re-freeze Assumptions" : "Freeze Assumptions"}
        </Button>
      </Stack>
      {board.assumptionsFrozen ? (
        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
          <Chip size="small" color="success" variant="outlined" label="Assumptions frozen" />
          <Typography variant="caption" color="text.secondary">
            {summarizeAssumptionsFreeze(compareAssumptionsFreeze!)}
          </Typography>
        </Stack>
      ) : null}
      {board.periodMismatch || board.providerMismatch ? (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          {board.periodMismatch ? "Period labels differ between baseline and after. " : ""}
          {board.providerMismatch ? "Provider labels differ. " : ""}
          Prefer matching exports for a clean variance read.
        </Alert>
      ) : null}
      {board.liveAssumptionsDrift ? (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Live Assumptions changed since this compare was frozen. Re-freeze to adopt current
          knobs.
        </Alert>
      ) : null}
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
      <DataTable>
        <TableHead>
          <TableRow>
            <TableCell>Team</TableCell>
            <TableCell align="right">Baseline bill</TableCell>
            <TableCell align="right">After bill</TableCell>
            <TableCell align="right">Est. reduction</TableCell>
            <TableCell align="right">Actual Δ</TableCell>
            <TableCell align="right">Variance</TableCell>
            <TableCell align="right">Gap %</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((row) => (
            <VarianceRow key={row.team} row={row} highlight={teamId === row.team} />
          ))}
          {!teamId ? <VarianceRow row={board.bu} highlight /> : null}
        </TableBody>
      </DataTable>
      {!teamId ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          BU row sums scan estimates across teams; billed usage rows follow imported/synced
          exports.
        </Typography>
      ) : null}
    </>
  );
}
