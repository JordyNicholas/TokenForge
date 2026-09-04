import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  compareCohorts,
  formatUsd,
  type VarianceBoard,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { KpiCard, KpiRow } from "./Kpi";

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;
}

export function CohortCompareCard({ board }: { board: VarianceBoard }) {
  const { fixOnTeams, changeMarkersLabel, loadDemoChangeMarkers } = useDashboard();
  const compare = compareCohorts(board, fixOnTeams);

  if (!compare.hasFixOn) {
    return (
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        <AlertTitle>Cohort compare (Fix-on vs control)</AlertTitle>
        Load Prove change markers from <code>apply</code> / <code>org-pack</code>{" "}
        (Data source → Load Fix change markers…) or{" "}
        <Chip
          size="small"
          label="Load demo markers"
          onClick={() => {
            void loadDemoChangeMarkers();
          }}
          sx={{ mx: 0.5 }}
        />{" "}
        to tag Fix-on teams. {compare.honestyNote}
      </Alert>
    );
  }

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="subtitle2">Cohort compare</Typography>
        {changeMarkersLabel ? (
          <Chip size="small" variant="outlined" label={changeMarkersLabel} />
        ) : null}
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`Fix-on: ${compare.fixOn.teams.join(", ")}`}
        />
        {compare.control.teamCount > 0 ? (
          <Chip
            size="small"
            variant="outlined"
            label={`Control: ${compare.control.teams.join(", ")}`}
          />
        ) : (
          <Chip size="small" color="warning" variant="outlined" label="No control cohort" />
        )}
      </Stack>
      <Typography variant="body2">{compare.narrative}</Typography>
      <KpiRow>
        <KpiCard
          label="Fix-on · actual billed Δ"
          value={signedUsd(compare.fixOn.actualBilledChangeUsd)}
          hint={`${compare.fixOn.teamCount} team(s)`}
        />
        <KpiCard
          label="Control · actual billed Δ"
          value={
            compare.control.teamCount > 0
              ? signedUsd(compare.control.actualBilledChangeUsd)
              : "—"
          }
          hint={
            compare.control.teamCount > 0
              ? `${compare.control.teamCount} team(s)`
              : "No control teams"
          }
        />
        <KpiCard
          label="Fix-on vs control"
          value={
            compare.relativeBilledDeltaUsd !== null
              ? signedUsd(compare.relativeBilledDeltaUsd)
              : "—"
          }
          hint="Relative billed Δ (Fix-on − control)"
        />
        <KpiCard
          label="Fix-on gap"
          value={compare.fixOn.gapPercentLabel}
          hint="% of Fix-on estimate"
        />
      </KpiRow>
      <Typography variant="caption" color="text.secondary">
        {compare.honestyNote}
      </Typography>
    </Stack>
  );
}
