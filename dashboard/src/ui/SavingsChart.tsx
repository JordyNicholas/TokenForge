import { BarChart } from "@mui/x-charts/BarChart";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { formatTokens } from "../domain";

export function SavingsChart({
  reports,
  onSelectTeam,
}: {
  reports: TokenRiskReport[];
  onSelectTeam?: (team: string) => void;
}) {
  const teams = reports.map((report) => report.team);
  const before = reports.map((report) => report.totals.beforeTokens);
  const after = reports.map((report) => report.totals.afterTokens);
  const saved = reports.map((report) => report.totals.savedTokens);

  return (
    <BarChart
      height={320}
      borderRadius={8}
      grid={{ horizontal: true }}
      xAxis={[{ data: teams, scaleType: "band" }]}
      yAxis={[
        {
          valueFormatter: (value: number | null) => formatTokens(value ?? 0),
          width: 72,
        },
      ]}
      series={[
        {
          id: "before",
          label: "Before",
          data: before,
          valueFormatter: (value) => formatTokens(value ?? 0),
        },
        {
          id: "after",
          label: "After",
          data: after,
          valueFormatter: (value) => formatTokens(value ?? 0),
        },
        {
          id: "saved",
          label: "Saved",
          data: saved,
          valueFormatter: (value) => formatTokens(value ?? 0),
        },
      ]}
      onItemClick={(_event, item) => {
        const team = teams[item.dataIndex];
        if (team && onSelectTeam) {
          onSelectTeam(team);
        }
      }}
    />
  );
}
