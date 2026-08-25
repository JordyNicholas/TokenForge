import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  compareUsagePeriods,
  formatGapPercent,
  formatUsd,
  type Assumptions,
  type UsageMetrics,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { KpiCard, KpiRow } from "./Kpi";

/**
 * Pitch / pilot KPI strip for estimate vs actual honesty (#98).
 * Reuses the same compare math as Overview — billed usage, not pipeline metering.
 */
export function PilotKpiCard({
  baselineTotals,
  assumptions,
  teamId,
}: {
  baselineTotals: TokenRiskTotals;
  assumptions: Assumptions;
  teamId: string | null;
}) {
  const {
    compareBaselineUsage,
    compareAfterUsage,
    compareAssumptionsFreeze,
    fixOnTeams,
  } = useDashboard();

  if (!compareBaselineUsage || !compareAfterUsage) {
    return (
      <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
        <AlertTitle>Pilot KPI card</AlertTitle>
        Import baseline + after-period billed usage to show estimated reduction, actual
        billed change, and variance. Honest FinOps reconcile — not agent pipeline metering.
      </Alert>
    );
  }

  const compare = compareUsagePeriods({
    baselineUsage: compareBaselineUsage,
    afterUsage: compareAfterUsage,
    teamId,
    baselineTotals,
    liveAssumptions: assumptions,
    frozenAssumptions: compareAssumptionsFreeze,
  });
  if (!compare) {
    return null;
  }

  const signed = (value: number) =>
    `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;

  return (
    <Alert severity="success" variant="outlined" sx={{ mb: 1 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 1 }}
      >
        <AlertTitle sx={{ m: 0 }}>
          Pilot KPI · estimate vs actual
          {teamId ? ` · ${teamId}` : " · BU"}
        </AlertTitle>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Chip size="small" label={`${compare.baseline.period} → ${compare.after.period}`} />
          {fixOnTeams.length > 0 ? (
            <Chip size="small" color="primary" variant="outlined" label="Cohort tagged" />
          ) : null}
          {compare.assumptionsFrozen ? (
            <Chip size="small" color="success" variant="outlined" label="Assumptions frozen" />
          ) : null}
        </Stack>
      </Stack>
      <KpiRow>
        <KpiCard
          label="Estimated reduction"
          value={formatUsd(compare.estimatedUsdReduction)}
          hint="Scan × assumptions"
        />
        <KpiCard
          label="Actual billed change"
          value={signed(compare.actualBilledChange)}
          hint="Baseline $ − after $"
        />
        <KpiCard
          label="Variance"
          value={signed(compare.varianceUsd)}
          hint="Actual − estimated"
        />
        <KpiCard
          label="Gap"
          value={formatGapPercent(compare.gapPercent) ?? "—"}
          hint="% of estimate"
        />
      </KpiRow>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        Reconciles estimated context-waste savings with imported or synced vendor usage for
        a period. We do not tap the agent&apos;s private pipeline
        {fixOnTeams.length > 0
          ? "; cohort tags reduce “was that TokenForge?” noise but do not prove 100% causality"
          : ""}
        .
      </Typography>
    </Alert>
  );
}
