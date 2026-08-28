import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  ADOPTION_HONESTY_NOTE,
  ADOPTION_UNAVAILABLE,
  computeRepoCoverage,
  formatCoverageLabel,
  formatPercent,
} from "../domain";
import { GlossaryTip } from "./GlossaryTip";
import { KpiCard, KpiRow } from "./Kpi";

export function AdoptionMetricsCard({
  reports,
  fixOnTeams,
}: {
  reports: readonly TokenRiskReport[];
  fixOnTeams: readonly string[];
}) {
  if (reports.length === 0) {
    return null;
  }

  const coverage = computeRepoCoverage(reports, fixOnTeams);

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" component="h2">
          Adoption
        </Typography>
        <GlossaryTip
          term="Repo coverage"
          definition="Share of teams on this board with scan reports and Fix apply markers. FinOps adoption signal — not vendor agent metering."
        />
      </Stack>
      <KpiRow>
        <KpiCard
          label="Teams with scan"
          value={
            coverage.scanCoveragePercent !== null
              ? formatPercent(coverage.scanCoveragePercent)
              : ADOPTION_UNAVAILABLE
          }
          hint={formatCoverageLabel(coverage.teamsWithScan, coverage.totalTeams)}
        />
        <KpiCard
          label="Teams with Fix apply"
          value={
            coverage.applyCoveragePercent !== null
              ? formatPercent(coverage.applyCoveragePercent)
              : ADOPTION_UNAVAILABLE
          }
          hint={
            coverage.applyCoveragePercent !== null
              ? formatCoverageLabel(coverage.teamsWithApplyMarker, coverage.totalTeams)
              : "Load prove-change markers from Source"
          }
        />
        <KpiCard
          label="Session Filter (extension)"
          value={ADOPTION_UNAVAILABLE}
          hint="Live % filtered + event count in Context Guard"
        />
        <KpiCard
          label="Board scope"
          value={String(coverage.totalTeams)}
          hint="Unique teams on loaded seed"
        />
      </KpiRow>
      <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {ADOPTION_HONESTY_NOTE}
        </Typography>
      </Alert>
    </Box>
  );
}
