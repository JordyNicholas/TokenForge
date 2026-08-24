import { Page } from "../ui/Page";
import { VarianceBoardPanel } from "../ui/VarianceBoardPanel";
import { useLayerView } from "../state/useLayerView";

export function VarianceBoardPage() {
  const { seed, reports, assumptions, teamId, scopeLabel } = useLayerView();

  return (
    <Page
      title={`Variance · ${seed?.businessUnit ?? "Business unit"} · ${scopeLabel}`}
      lead="Baseline vs after billed usage reconciled against scan-based estimates. Billed usage compare — not agent pipeline metering."
    >
      <VarianceBoardPanel reports={reports} assumptions={assumptions} teamId={teamId} />
    </Page>
  );
}
