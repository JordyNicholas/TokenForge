import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatUsd, usageForTeam, type UsageMetrics } from "../domain";

export function UsageMetricsCard({
  usage,
  teamId,
  usageLabel,
}: {
  usage: UsageMetrics | null | undefined;
  teamId: string | null;
  usageLabel?: string | null;
}) {
  if (!usage) {
    return (
      <Alert severity="info" variant="outlined">
        No billed usage loaded. Import a FinOps CSV/JSON export from Data source
        (same <code>UsageMetrics</code> contract as the demo). This is billed usage
        compare — not agent pipeline metering, and not a live vendor billing API.
      </Alert>
    );
  }
  const slice = usageForTeam(usage, teamId);
  if (!slice) {
    return (
      <Alert severity="info" variant="outlined">
        No imported usage row for this team. Import is file-based billed usage —
        not a live vendor billing API, and not agent pipeline metering.
      </Alert>
    );
  }
  return (
    <Alert
      severity="success"
      variant="outlined"
      icon={false}
      sx={{ "& .MuiAlert-message": { width: "100%" } }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Imported billed usage · {teamId ? teamId : "BU total"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {usage.providerLabel} · {usage.period} · {slice.creditsUsed.toLocaleString()}{" "}
            credits · {formatUsd(slice.estimatedUsd)} billed
            {usageLabel ? ` · ${usageLabel}` : ""}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={usage.source === "demo" ? "Demo import" : "File import"}
          color="success"
          variant="outlined"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Billed usage compare from an imported export — not live Copilot/Cursor/Claude
        sync, and not metering of any agent pipeline.
      </Typography>
    </Alert>
  );
}
