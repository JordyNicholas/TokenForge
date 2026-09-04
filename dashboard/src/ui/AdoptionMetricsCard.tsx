import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
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
  sessionFilteredPercent,
  sessionFilterEventCount,
}: {
  reports: readonly TokenRiskReport[];
  fixOnTeams: readonly string[];
  sessionFilteredPercent?: number | null;
  sessionFilterEventCount?: number | null;
}) {
  if (reports.length === 0) {
    return null;
  }

  const coverage = computeRepoCoverage(reports, fixOnTeams);
  const sessionAvailable =
    typeof sessionFilteredPercent === "number" &&
    Number.isFinite(sessionFilteredPercent);

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" component="h2">
          Adoption
        </Typography>
        <GlossaryTip
          term="Repo coverage"
          definition="Share of teams with scan reports and Fix apply markers. FinOps adoption signal — not vendor agent metering."
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
          label="Session Filter"
          value={
            sessionAvailable
              ? formatPercent(sessionFilteredPercent)
              : ADOPTION_UNAVAILABLE
          }
          hint={
            sessionAvailable
              ? `${sessionFilterEventCount ?? 0} event(s)`
              : "Load session-stats.json"
          }
        />
        <KpiCard
          label="Board scope"
          value={String(coverage.totalTeams)}
          hint="Unique teams"
        />
      </KpiRow>
    </Box>
  );
}
