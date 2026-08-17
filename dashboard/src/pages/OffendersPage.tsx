import { formatTokens, tokensByFileClass, topOffenders } from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { ClassBars } from "../ui/ClassBars";
import { Page } from "../ui/Page";

export function OffendersPage() {
  const { reports } = useDashboard();
  const offenders = topOffenders(reports, 10);
  const classes = tokensByFileClass(reports);

  return (
    <Page
      title="Top offenders"
      lead="Highest-token paths marked excluded or filtered, plus waste by filetype class from risk-core."
    >
      <h2 className="subhead">By filetype class</h2>
      <ClassBars buckets={classes} />

      <h2 className="subhead">By path</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Team</th>
            <th>Class</th>
            <th>Reason</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          {offenders.map((row) => (
            <tr key={`${row.team}:${row.path}`}>
              <td>{row.path}</td>
              <td>{row.team}</td>
              <td>{row.fileClass}</td>
              <td>{row.reason}</td>
              <td className="num">{formatTokens(row.estTokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Page>
  );
}
