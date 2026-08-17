import { tokenSavedPercent } from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { HeatCell } from "../ui/HeatCell";
import { Page } from "../ui/Page";

export function HeatmapPage() {
  const { seed, reports } = useDashboard();

  return (
    <Page
      title="Team heatmap"
      lead={
        <>
          Color is each team’s scan exclusion ratio.{" "}
          {seed?.businessUnit ?? "This BU"} rolls up to ~30% on the demo seed;
          payments-platform is the noisy outlier.
        </>
      }
    >
      <div className="heatmap">
        {reports.map((report) => (
          <HeatCell
            key={`${report.team}:${report.repo}`}
            team={report.team}
            repo={report.repo}
            percent={tokenSavedPercent(report.totals)}
            savedTokens={report.totals.savedTokens}
          />
        ))}
      </div>
    </Page>
  );
}
