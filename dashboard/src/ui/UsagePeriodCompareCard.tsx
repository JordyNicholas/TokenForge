import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  compareUsagePeriods,
  formatUsd,
  summarizeAssumptionsFreeze,
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
  const {
    afterUsage,
    afterUsageLabel,
    clearAfterUsage,
    compareAssumptionsFreeze,
    freezeCompareAssumptions,
  } = useDashboard();

  if (!baselineUsage || !afterUsage) {
    return null;
  }

  const compare = compareUsagePeriods({
    baselineUsage,
    afterUsage,
    teamId,
    baselineTotals,
    liveAssumptions: assumptions,
    frozenAssumptions: compareAssumptionsFreeze,
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
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          {compare.assumptionsFrozen ? (
            <Button size="small" color="inherit" onClick={freezeCompareAssumptions}>
              Re-freeze Assumptions
            </Button>
          ) : (
            <Button size="small" color="inherit" onClick={freezeCompareAssumptions}>
              Freeze Assumptions
            </Button>
          )}
          <Button size="small" color="inherit" onClick={clearAfterUsage}>
            Clear after usage
          </Button>
        </Stack>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {compare.baseline.period} → {compare.after.period}
        {afterUsageLabel ? ` · ${afterUsageLabel}` : ""}. Estimated $ uses{" "}
        {compare.assumptionsFrozen ? "frozen" : "live"} Assumptions × the baseline scan.
        This is billed usage compare — not agent pipeline metering, and not live vendor
        sync.
      </Typography>
      {compare.assumptionsFrozen ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { sm: "center" }, mb: 1 }}
        >
          <Chip size="small" color="success" variant="outlined" label="Assumptions frozen" />
          <Typography variant="caption" color="text.secondary">
            {summarizeAssumptionsFreeze(compare.assumptionsUsed)}
          </Typography>
        </Stack>
      ) : null}
      {compare.liveAssumptionsDrift ? (
        <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
          Live Assumptions changed since this compare was frozen. Estimated $ and variance
          still use the freeze — re-freeze to adopt the current knobs.
        </Typography>
      ) : null}
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
          hint={compare.assumptionsFrozen ? "Scan × frozen assumptions" : "Scan × assumptions"}
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
