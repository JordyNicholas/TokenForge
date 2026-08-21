import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { useDashboard } from "../state/DashboardProvider";
import { useBoardLayer } from "../state/useLayerView";

export function DemoOnboardingBanner() {
  const { isDemoSource, demoBannerDismissed, dismissDemoBanner, seed } = useDashboard();
  const boardLayer = useBoardLayer();

  if (!isDemoSource || demoBannerDismissed) {
    return null;
  }

  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ mb: 1 }}
      action={
        <Button color="inherit" size="small" onClick={dismissDemoBanner}>
          Dismiss
        </Button>
      }
    >
      <AlertTitle>Demo data loaded</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        You&apos;re viewing{" "}
        <strong>{seed?.businessUnit ?? "a sample business unit"}</strong>. Load your CLI
        report (<code>.tokenforge/scan-report.json</code>) or extension export (
        <code>.tokenforge/last-scan.json</code>) from the source menu, or open with{" "}
        <code>?src=/last-scan.json</code>.
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button
          size="small"
          component={RouterLink}
          to={`/board/${boardLayer}/assumptions`}
          variant="outlined"
        >
          Open Assumptions
        </Button>
        <Button size="small" component={RouterLink} to={`/board/${boardLayer}`} variant="text">
          Overview
        </Button>
      </Stack>
    </Alert>
  );
}
