import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { LlmAnalysisOverview } from "@tokenforge/risk-core";

export function LlmAnalysisOverviewCard({
  overview,
  title = "Model analysis",
}: {
  overview: LlmAnalysisOverview;
  title?: string;
}) {
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {overview.summary}
      </Typography>
      {overview.themes && overview.themes.length > 0 ? (
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1.25, flexWrap: "wrap" }}>
          {overview.themes.map((theme) => (
            <Chip key={theme} size="small" label={theme} variant="outlined" />
          ))}
        </Stack>
      ) : null}
      {overview.caveats && overview.caveats.length > 0 ? (
        <Stack component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
          {overview.caveats.map((caveat) => (
            <Typography key={caveat} component="li" variant="caption" color="text.secondary">
              {caveat}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Alert>
  );
}
