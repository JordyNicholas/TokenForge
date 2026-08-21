import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useDashboard } from "../state/DashboardProvider";

export function PrivacyControls({
  showNote = false,
}: {
  /** When true, show the non-demo sensitivity warning. */
  showNote?: boolean;
}) {
  const { isDemoSource, redactPaths, setRedactPaths, sourceLabel } = useDashboard();

  return (
    <Stack spacing={1}>
      {showNote && !isDemoSource ? (
        <Alert severity="warning" variant="outlined">
          Paths and finding details may reflect internal repo structure. Prefer path
          redaction before screen shares. Loading a public <code>?src=</code> URL can expose
          the report to anyone with the link.
          <Typography variant="caption" component="span" sx={{ mt: 0.75, display: "block" }} color="text.secondary">
            Source: {sourceLabel}
          </Typography>
        </Alert>
      ) : null}
      <FormControlLabel
        control={
          <Switch
            checked={redactPaths}
            onChange={(_event, checked) => setRedactPaths(checked)}
            size="small"
          />
        }
        label="Redact full paths (basename only) — for screen shares"
      />
    </Stack>
  );
}
