import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import { formatPercent, formatTokens, tokenSavedPercent } from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { KpiCard, KpiRow } from "./Kpi";

export function AfterFixCompareCard({
  beforeTotals,
}: {
  beforeTotals: TokenRiskTotals;
}) {
  const { afterFixSeed, afterFixLabel, afterFixTotals, clearAfterFix } = useDashboard();

  if (!afterFixSeed || !afterFixTotals) {
    return null;
  }

  const beforePct = tokenSavedPercent(beforeTotals);
  const afterPct = tokenSavedPercent(afterFixTotals);
  const deltaSaved = afterFixTotals.savedTokens - beforeTotals.savedTokens;

  return (
    <Alert severity="success" variant="outlined" sx={{ mb: 1 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between", mb: 1 }}
      >
        <AlertTitle sx={{ m: 0 }}>Before → after Fix compare</AlertTitle>
        <Button size="small" color="inherit" onClick={clearAfterFix}>
          Clear compare
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Comparing the active board totals against{" "}
        <strong>{afterFixLabel ?? afterFixSeed.businessUnit}</strong>. This is a local
        snapshot diff — not live vendor billing.
      </Typography>
      <KpiRow>
        <KpiCard
          label="Before saved"
          value={formatTokens(beforeTotals.savedTokens)}
          hint={`${formatPercent(beforePct)} exclusion`}
        />
        <KpiCard
          label="After Fix saved"
          value={formatTokens(afterFixTotals.savedTokens)}
          hint={`${formatPercent(afterPct)} exclusion`}
        />
        <KpiCard
          label="Delta saved tokens"
          value={`${deltaSaved >= 0 ? "+" : ""}${formatTokens(deltaSaved)}`}
          hint="After − before"
        />
      </KpiRow>
    </Alert>
  );
}
