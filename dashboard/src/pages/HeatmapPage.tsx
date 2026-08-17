import { useDashboard } from "../DashboardContext";
import { formatPercent, formatTokens, tokenSavedPercent } from "../calculator";
import { heatColor } from "../views";

export function HeatmapPage() {
  const { seed, reports } = useDashboard();

  return (
    <section className="page">
      <h1>Team heatmap</h1>
      <p className="muted">
        Color is each team’s scan exclusion ratio. {seed?.businessUnit ?? "This BU"}{" "}
        rolls up to ~30% on the demo seed; payments-platform is the noisy outlier.
      </p>
      <div className="heatmap">
        {reports.map((report) => {
          const percent = tokenSavedPercent(report.totals);
          return (
            <article
              key={`${report.team}:${report.repo}`}
              className="heat-cell"
              style={{ background: heatColor(percent) }}
            >
              <h2>{report.team}</h2>
              <p className="heat-percent">{formatPercent(percent)}</p>
              <p className="heat-meta">
                {report.repo}
                <br />
                {formatTokens(report.totals.savedTokens)} tokens avoided
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
