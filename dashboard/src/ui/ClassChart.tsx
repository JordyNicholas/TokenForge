import { BarChart } from "@mui/x-charts/BarChart";
import { formatTokens, type ClassBucket } from "../domain";

export function ClassChart({ buckets }: { buckets: ClassBucket[] }) {
  const labels = buckets.map((bucket) => bucket.fileClass);
  const values = buckets.map((bucket) => bucket.estTokens);

  return (
    <BarChart
      layout="horizontal"
      height={Math.max(220, buckets.length * 56)}
      borderRadius={8}
      grid={{ vertical: true }}
      yAxis={[{ data: labels, scaleType: "band", width: 88 }]}
      xAxis={[
        {
          valueFormatter: (value: number | null) => formatTokens(value ?? 0),
        },
      ]}
      series={[
        {
          id: "class",
          label: "Tokens",
          data: values,
          valueFormatter: (value) => formatTokens(value ?? 0),
        },
      ]}
    />
  );
}
