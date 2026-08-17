import {
  formatPercent,
  formatTokens,
  formatUsd,
  tokenSavedPercent,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { KpiCard, KpiRow } from "../ui/Kpi";
import { Page } from "../ui/Page";

export function OverviewPage() {
  const { seed, reports, totals, projection } = useDashboard();

  return (
    <Page
      title={`${seed?.businessUnit ?? "Business unit"} overview`}
      lead={
        <>
          Scenario savings on default assumptions is{" "}
          {formatPercent(projection.scenarioSavedPercent)}. That figure is
          calculator math, not a vendor billing API.
        </>
      }
    >
      <KpiRow>
        <KpiCard label="Tokens saved" value={formatTokens(totals.savedTokens)} />
        <KpiCard
          label="$ saved / month"
          value={formatUsd(projection.monthlyUsdSaved)}
        />
        <KpiCard
          label="Scenario savings"
          value={formatPercent(projection.scenarioSavedPercent)}
        />
      </KpiRow>

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
    </Page>
  );
}
