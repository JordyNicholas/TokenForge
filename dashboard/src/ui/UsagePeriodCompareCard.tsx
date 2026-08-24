import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  compareUsagePeriods,
  formatUsd,
  type Assumptions,
  type UsageMetrics,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { KpiCard, KpiRow } from "./Kpi";

export function UsagePeriodCompareCard({
  baselineUsage,
  baselineTotals,
  assumptions,
  teamId,
}: {
  baselineUsage: UsageMetrics | null | undefined;
  baselineTotals: TokenRiskTotals;
  assumptions: Assumptions;
  teamId: string | null;
}) {
  const { afterUsage, afterUsageLabel, clearAfterUsage } = useDashboard();

  if (!baselineUsage || !afterUsage) {
    return null;
  }

  const compare = compareUsagePeriods({
    baselineUsage,
    afterUsage,
    teamId,
    baselineTotals,
    assumptions,
  });

  if (!compare) {
    return (
      <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
        After-period usage has no row for this team. Import a matching FinOps export or
        switch to Global. Billed usage compare — not agent pipeline metering.
      </Alert>
    );
  }

  const signed = (value: number) =>
    `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;

  return (
    <Alert severity="success" variant="outlined" sx={{ mb: 1 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between", mb: 1 }}
      >
        <AlertTitle sx={{ m: 0 }}>
          Baseline → after billed usage
          {teamId ? ` · ${teamId}` : " · BU"}
        </AlertTitle>
        <Button size="small" color="inherit" onClick={clearAfterUsage}>
          Clear after usage
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {compare.baseline.period} → {compare.after.period}
        {afterUsageLabel ? ` · ${afterUsageLabel}` : ""}. Estimated $ uses the baseline
        scan × current Assumptions. This is billed usage compare — not agent pipeline
        metering, and not live vendor sync.
      </Typography>
      {compare.periodMismatch || compare.providerMismatch ? (
        <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
          {[
            compare.periodMismatch
              ? `Periods differ (${compare.baseline.period} vs ${compare.after.period})`
              : null,
            compare.providerMismatch
              ? `Providers differ (${compare.baseline.providerLabel} vs ${compare.after.providerLabel})`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          . Prefer matching period/provider for a clean variance read.
        </Typography>
      ) : null}
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
      </KpiRow>
    </Alert>
  );
}
