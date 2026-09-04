import { PieChart } from "@mui/x-charts/PieChart";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import { boardHasSavings, formatTokens } from "../domain";
import { EmptyState } from "./EmptyState";

export function MixChart({ totals }: { totals: TokenRiskTotals }) {
  if (!boardHasSavings(totals)) {
    return (
      <EmptyState
        title="No mix to chart"
        body="Saved vs remaining needs positive scan totals on this board. Try Combined or Heuristic."
      />
    );
  }

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
