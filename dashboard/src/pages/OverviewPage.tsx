import { useDashboard } from "../DashboardContext";
import {
  formatPercent,
  formatTokens,
  formatUsd,
  tokenSavedPercent,
} from "../calculator";

export function OverviewPage() {
  const { seed, reports, totals, projection } = useDashboard();

  return (
    <section className="page">
      <h1>{seed?.businessUnit ?? "Business unit"} overview</h1>
      <p className="muted">
        Scenario savings on default assumptions is {formatPercent(projection.scenarioSavedPercent)}.
        That figure is calculator math, not a vendor billing API.
      </p>

      <div className="kpi-row">
        <article className="kpi">
          <p className="kpi-label">Tokens saved</p>
          <p className="kpi-value">{formatTokens(totals.savedTokens)}</p>
        </article>
        <article className="kpi">
          <p className="kpi-label">$ saved / month</p>
          <p className="kpi-value">{formatUsd(projection.monthlyUsdSaved)}</p>
        </article>
        <article className="kpi">
          <p className="kpi-label">Scenario savings</p>
          <p className="kpi-value">{formatPercent(projection.scenarioSavedPercent)}</p>
        </article>
      </div>

      <table className="data-table">
        <caption>Teams in this business unit</caption>
        <thead>
          <tr>
            <th>Team</th>
            <th>Repo</th>
            <th>Before</th>
            <th>After</th>
            <th>Saved</th>
            <th>Scan %</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={`${report.team}:${report.repo}`}>
              <td>{report.team}</td>
              <td>{report.repo}</td>
              <td className="num">{formatTokens(report.totals.beforeTokens)}</td>
              <td className="num">{formatTokens(report.totals.afterTokens)}</td>
              <td className="num">{formatTokens(report.totals.savedTokens)}</td>
              <td className="num">{formatPercent(tokenSavedPercent(report.totals))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={2}>BU total</th>
            <td className="num">{formatTokens(totals.beforeTokens)}</td>
            <td className="num">{formatTokens(totals.afterTokens)}</td>
            <td className="num">{formatTokens(totals.savedTokens)}</td>
            <td className="num">{formatPercent(projection.tokenSavedPercent)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
