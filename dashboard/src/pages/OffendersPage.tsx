import { useDashboard } from "../DashboardContext";
import { formatTokens } from "../calculator";
import { tokensByFileClass, topOffenders } from "../views";

export function OffendersPage() {
  const { reports } = useDashboard();
  const offenders = topOffenders(reports, 10);
  const classes = tokensByFileClass(reports);

  return (
    <section className="page">
      <h1>Top offenders</h1>
      <p className="muted">
        Highest-token paths marked excluded or filtered, plus waste by filetype
        class from risk-core.
      </p>

      <h2 className="subhead">By filetype class</h2>
      <ul className="class-bars">
        {classes.map((bucket) => {
          const max = classes[0]?.estTokens ?? 1;
          const width = Math.max(8, (bucket.estTokens / max) * 100);
          return (
            <li key={bucket.fileClass}>
              <span className="class-label">{bucket.fileClass}</span>
              <span className="class-bar-track">
                <span className="class-bar" style={{ width: `${width}%` }} />
              </span>
              <span className="num">{formatTokens(bucket.estTokens)}</span>
            </li>
          );
        })}
      </ul>

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
    </section>
  );
}
