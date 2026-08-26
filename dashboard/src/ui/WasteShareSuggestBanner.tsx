import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  compareUsagePeriods,
  formatPercent,
  formatUsd,
  suggestRealizedWasteShare,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { useLayerView } from "../state/useLayerView";

/**
 * Suggests realizedWasteShare from the active baseline → after variance pair (#97).
 */
export function WasteShareSuggestBanner() {
  const { assumptions, totals, patchAssumptions, teamId } = useLayerView();
  const {
    compareBaselineUsage,
    compareAfterUsage,
    compareAssumptionsFreeze,
    freezeCompareAssumptions,
  } = useDashboard();

  if (!compareBaselineUsage || !compareAfterUsage) {
    return null;
  }

  const compare = compareUsagePeriods({
    baselineUsage: compareBaselineUsage,
    afterUsage: compareAfterUsage,
    teamId,
    baselineTotals: totals,
    liveAssumptions: assumptions,
    frozenAssumptions: compareAssumptionsFreeze,
  });
  if (!compare) {
    return null;
  }

  const suggestion = suggestRealizedWasteShare({
    currentShare: compare.assumptionsUsed.realizedWasteShare,
    estimatedUsdReduction: compare.estimatedUsdReduction,
    actualBilledChange: compare.actualBilledChange,
  });
  if (!suggestion) {
    return null;
  }
  if (suggestion.suggestedShare === suggestion.currentShare) {
    return (
      <Alert severity="success" variant="outlined">
        Waste applicability ({formatPercent(suggestion.currentShare * 100)}) already
        matches the observed billed reduction for this compare.
      </Alert>
    );
  }

  return (
    <Alert severity="info" variant="outlined">
      <AlertTitle>Suggest waste applicability from variance</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Observed billed Δ {formatUsd(suggestion.actualBilledChange)} vs estimated{" "}
        {formatUsd(suggestion.estimatedUsdReduction)}. Suggested share{" "}
        <strong>{formatPercent(suggestion.suggestedShare * 100)}</strong> (now{" "}
        {formatPercent(suggestion.currentShare * 100)}).
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
        {suggestion.rationale} Billed usage calibrate — not agent pipeline metering.
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            patchAssumptions({ realizedWasteShare: suggestion.suggestedShare });
            freezeCompareAssumptions();
          }}
        >
          Apply {formatPercent(suggestion.suggestedShare * 100)} + re-freeze
        </Button>
      </Stack>
    </Alert>
  );
}
