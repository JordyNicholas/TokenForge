import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { HybridScanSummary } from "../domain";
import { formatTokens } from "../domain";

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
}

export function HybridScanMetaCard({
  summaries,
}: {
  summaries: HybridScanSummary[];
}) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 0.5 }}>
      {summaries.map(({ team, repo, llm }) => (
        <Alert
          key={`${team}:${repo}:${llm.backend}:${llm.model}`}
          severity="info"
          variant="outlined"
        >
          <AlertTitle>
            Hybrid Detect · {summaries.length > 1 ? team : "how this scan worked"}
          </AlertTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Optional semantic pass on a bounded candidate set. Heuristic baseline still
            applies; Fix uses the Combined layer.
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip size="small" label={`Backend: ${llm.backend}`} variant="outlined" />
            <Chip size="small" label={`Model: ${llm.model}`} variant="outlined" />
            <Chip
              size="small"
              label={`Candidates: ${formatTokens(llm.candidatesSent)}`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Duration: ${formatDuration(llm.durationMs)}`}
              variant="outlined"
            />
            {llm.endpoint ? (
              <Chip size="small" label={llm.endpoint} variant="outlined" />
            ) : null}
            {summaries.length > 1 ? (
              <Chip size="small" label={repo} variant="outlined" />
            ) : null}
          </Stack>
        </Alert>
      ))}
    </Stack>
  );
}
