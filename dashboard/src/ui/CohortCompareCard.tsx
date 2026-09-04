import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  compareCohorts,
  formatUsd,
  type VarianceBoard,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { GlossaryTip } from "./GlossaryTip";
import { KpiCard, KpiRow } from "./Kpi";

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;
}

export function CohortCompareCard({ board }: { board: VarianceBoard }) {
  const { fixOnTeams, changeMarkersLabel, loadDemoChangeMarkers } = useDashboard();
  const compare = compareCohorts(board, fixOnTeams);

  if (!compare.hasFixOn) {
    return (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          <GlossaryTip term="Cohort compare" termId="cohort" /> needs Fix change markers.
        </Typography>
        <Chip
          size="small"
          label="Load demo markers"
          onClick={() => {
            void loadDemoChangeMarkers();
          }}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="subtitle2">
          <GlossaryTip term="Cohort compare" termId="cohort" />
        </Typography>
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
          <Chip size="small" color="warning" variant="outlined" label="No control" />
        )}
      </Stack>
      <KpiRow>
        <KpiCard
          label="Fix-on · billed Δ"
          value={signedUsd(compare.fixOn.actualBilledChangeUsd)}
          hint={`${compare.fixOn.teamCount} team(s)`}
        />
        <KpiCard
          label="Control · billed Δ"
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
          hint={compare.narrative}
        />
        <KpiCard
          label="Fix-on gap"
          value={compare.fixOn.gapPercentLabel}
          hint="% of Fix-on estimate"
        />
      </KpiRow>
    </Stack>
  );
}
