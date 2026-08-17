import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import {
  formatPercent,
  formatTokens,
  formatUsd,
  tokenSavedPercent,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { ChartCard } from "../ui/ChartCard";
import { DataTable } from "../ui/DataTable";
import { KpiCard, KpiRow } from "../ui/Kpi";
import { MixChart } from "../ui/MixChart";
import { Page } from "../ui/Page";
import { SavingsChart } from "../ui/SavingsChart";
import { TeamDetailDialog } from "../ui/TeamDetailDialog";

export function OverviewPage() {
  const { seed, reports, totals, projection } = useDashboard();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const selected = reports.find((report) => report.team === selectedTeam) ?? null;

  return (
    <Page
      title={`${seed?.businessUnit ?? "Business unit"} overview`}
      lead="Scenario savings is calculator math on loaded totals — not a vendor billing API."
    >
      <KpiRow>
        <KpiCard
          label="Tokens saved"
          value={formatTokens(totals.savedTokens)}
          hint="Excluded or filtered from context"
        />
        <KpiCard
          label="$ saved / month"
          value={formatUsd(projection.monthlyUsdSaved)}
          hint="Live from Assumptions"
        />
        <KpiCard
          label="Scenario savings"
          value={formatPercent(projection.scenarioSavedPercent)}
          hint="Pitch figure on this seed"
        />
        <KpiCard
          label="Teams"
          value={String(reports.length)}
          hint={seed?.businessUnit ?? "Business unit"}
        />
      </KpiRow>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) minmax(0, 1fr)" },
        }}
      >
        <ChartCard
          title="Tokens by team"
          subheader="Click a bar to open that team’s findings"
        >
          <SavingsChart reports={reports} onSelectTeam={setSelectedTeam} />
        </ChartCard>
        <ChartCard title="Saved vs remaining" subheader="BU roll-up of scan totals">
          <MixChart totals={totals} />
        </ChartCard>
      </Box>

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
          Teams in this business unit
        </Typography>
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell>Team</TableCell>
              <TableCell>Repo</TableCell>
              <TableCell align="right">Before</TableCell>
              <TableCell align="right">After</TableCell>
              <TableCell align="right">Saved</TableCell>
              <TableCell align="right">Scan %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow
                key={`${report.team}:${report.repo}`}
                hover
                selected={report.team === selectedTeam}
                onClick={() => setSelectedTeam(report.team)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>{report.team}</TableCell>
                <TableCell>{report.repo}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTokens(report.totals.beforeTokens)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTokens(report.totals.afterTokens)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTokens(report.totals.savedTokens)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(tokenSavedPercent(report.totals))}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                BU total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {formatTokens(totals.beforeTokens)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {formatTokens(totals.afterTokens)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {formatTokens(totals.savedTokens)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {formatPercent(projection.tokenSavedPercent)}
              </TableCell>
            </TableRow>
          </TableBody>
        </DataTable>
      </Box>

      <Alert severity="info" variant="outlined">
        Displayed $ uses editable assumptions (rate, team size, messages/day). Changing
        those knobs does not rewrite the scan JSON.
      </Alert>

      <TeamDetailDialog report={selected} onClose={() => setSelectedTeam(null)} />
    </Page>
  );
}
