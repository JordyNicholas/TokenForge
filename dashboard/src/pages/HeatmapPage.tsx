import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import { useState } from "react";
import { tokenSavedPercent } from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { heatFill, resolveColorMode } from "../theme/heat";
import { HeatCell } from "../ui/HeatCell";
import { Page } from "../ui/Page";
import { TeamDetailDialog } from "../ui/TeamDetailDialog";

export function HeatmapPage() {
  const { seed, reports } = useDashboard();
  const { mode, systemMode } = useColorScheme();
  const resolved = resolveColorMode(mode, systemMode);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const selected = reports.find((report) => report.team === selectedTeam) ?? null;

  return (
    <Page
      title="Team heatmap"
      lead={
        <>
          Color is each team’s scan exclusion ratio.{" "}
          {seed?.businessUnit ?? "This BU"} rolls up to ~30% on the demo seed;
          payments-platform is the noisy outlier. Click a cell for findings.
        </>
      }
    >
      <Stack direction="row" spacing={1.5} sx={{ maxWidth: 28 * 16, alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Low waste
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: 10,
            borderRadius: 99,
            background: `linear-gradient(90deg, ${heatFill(0, resolved)}, ${heatFill(100, resolved)})`,
          }}
        />
        <Typography variant="caption" color="text.secondary">
          High waste
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          gap: 2,
        }}
      >
        {reports.map((report) => (
          <HeatCell
            key={`${report.team}:${report.repo}`}
            team={report.team}
            repo={report.repo}
            percent={tokenSavedPercent(report.totals)}
            savedTokens={report.totals.savedTokens}
            selected={report.team === selectedTeam}
            onSelect={() => setSelectedTeam(report.team)}
          />
        ))}
      </Box>

      <TeamDetailDialog report={selected} onClose={() => setSelectedTeam(null)} />
    </Page>
  );
}
