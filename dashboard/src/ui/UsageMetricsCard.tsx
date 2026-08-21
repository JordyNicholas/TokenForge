import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatUsd, usageForTeam, type UsageMetrics } from "../domain";

export function UsageMetricsCard({
  usage,
  teamId,
}: {
  usage: UsageMetrics | null | undefined;
  teamId: string | null;
}) {
  if (!usage) {
    return null;
  }
  const slice = usageForTeam(usage, teamId);
  if (!slice) {
    return (
      <Alert severity="info" variant="outlined">
        No imported usage row for this team. Usage import is demo/file-based — not a live
        vendor billing API.
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
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Imported usage · {teamId ? teamId : "BU total"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {usage.providerLabel} · {usage.period} · {slice.creditsUsed.toLocaleString()}{" "}
            credits · {formatUsd(slice.estimatedUsd)} estimated
          </Typography>
        </Box>
        <Chip
          size="small"
          label={usage.source === "demo" ? "Demo import" : "File import"}
          color="success"
          variant="outlined"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        Pluggable usage metrics (issue #27 thin). Not live Copilot/Cursor/Claude billing sync.
      </Typography>
    </Alert>
  );
}
