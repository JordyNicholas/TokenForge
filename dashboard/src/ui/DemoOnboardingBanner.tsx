import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
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
      Demo: <strong>{seed?.businessUnit ?? "sample BU"}</strong>. Load your scan from Source, or
      open Variance after importing usage.
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
        <Button
          size="small"
          component={RouterLink}
          to={`/board/${boardLayer}/variance`}
          variant="contained"
        >
          Open Variance
        </Button>
        <Button
          size="small"
          component={RouterLink}
          to={`/board/${boardLayer}/glossary`}
          variant="text"
        >
          Glossary
        </Button>
      </Stack>
    </Alert>
  );
}
