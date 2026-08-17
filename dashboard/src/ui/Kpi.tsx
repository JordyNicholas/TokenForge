import type { ReactNode } from "react";

export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="kpi">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
    </article>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="kpi-row">{children}</div>;
}
