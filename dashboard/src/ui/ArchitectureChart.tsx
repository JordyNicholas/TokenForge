import { PieChart } from "@mui/x-charts/PieChart";
import type { ArchitectureBucket } from "../domain";
import { formatTokens } from "../domain";

export function ArchitectureChart({ buckets }: { buckets: ArchitectureBucket[] }) {
  if (buckets.length === 0) {
    return null;
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
          data: buckets.map((bucket, index) => ({
            id: index,
            value: bucket.savedTokens,
            label: bucket.label,
          })),
          valueFormatter: (item) => formatTokens(item.value),
        },
      ]}
    />
  );
}
