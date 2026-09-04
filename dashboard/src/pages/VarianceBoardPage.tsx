import Stack from "@mui/material/Stack";
import { Page } from "../ui/Page";
import { GlossaryTip } from "../ui/GlossaryTip";
import { VarianceBoardPanel } from "../ui/VarianceBoardPanel";
import { useLayerView } from "../state/useLayerView";

export function VarianceBoardPage() {
  const { seed, reports, assumptions, teamId, scopeLabel } = useLayerView();

  return (
    <Page
      title={`Variance · ${seed?.businessUnit ?? "Business unit"} · ${scopeLabel}`}
      lead={
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <GlossaryTip term="Bill reconcile" termId="bill-reconcile" />
          <GlossaryTip term="Variance" termId="variance" />
        </Stack>
      }
    >
      <VarianceBoardPanel reports={reports} assumptions={assumptions} teamId={teamId} />
    </Page>
  );
}
