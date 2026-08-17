import { PieChart } from "@mui/x-charts/PieChart";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import { formatTokens } from "../domain";

export function MixChart({ totals }: { totals: TokenRiskTotals }) {
  return (
    <PieChart
      height={320}
      hideLegend={false}
      series={[
        {
          innerRadius: 70,
          outerRadius: 110,
          paddingAngle: 2,
          cornerRadius: 6,
          highlightScope: { fade: "global", highlight: "item" },
          data: [
            {
              id: 0,
              value: totals.savedTokens,
              label: "Saved",
            },
            {
              id: 1,
              value: totals.afterTokens,
              label: "Remaining",
            },
          ],
          valueFormatter: (item) => formatTokens(item.value),
        },
      ]}
    />
  );
}
