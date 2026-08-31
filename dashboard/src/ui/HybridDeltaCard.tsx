import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { HybridDelta } from "@tokenforge/risk-core";
import { formatTokens } from "../domain";

export type HybridDeltaRow = {
  team: string;
  repo: string;
  delta: HybridDelta;
};

function statusLabel(status: HybridDelta["complementarityStatus"]): string {
  if (status === "ok") {
    return "Complementary";
  }
  if (status === "llm_empty") {
    return "Overview-only / empty findings";
  }
  return "Candidates skipped";
}

export function HybridDeltaCard({ rows }: { rows: HybridDeltaRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {rows.map(({ team, repo, delta }) => (
        <Alert
          key={`${team}:${repo}`}
          severity={delta.complementarityStatus === "ok" ? "success" : "info"}
          variant="outlined"
        >
          <AlertTitle>
            Hybrid complementarity · {rows.length > 1 ? team : "AI vs heuristic"}
          </AlertTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Heuristic baseline savings stay intact; the LLM layer adds{" "}
            {formatTokens(delta.llmExclusiveSavedTokens)} exclusive tokens across{" "}
            {delta.llmFindingCount} finding(s).
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip
              size="small"
              label={`Heuristic: ${formatTokens(delta.heuristicSavedTokens)}`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`LLM exclusive: ${formatTokens(delta.llmExclusiveSavedTokens)}`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Combined: ${formatTokens(delta.combinedSavedTokens)}`}
              variant="outlined"
            />
            <Chip size="small" label={statusLabel(delta.complementarityStatus)} variant="outlined" />
            {rows.length > 1 ? (
              <Chip size="small" label={repo} variant="outlined" />
            ) : null}
          </Stack>
        </Alert>
      ))}
    </Stack>
  );
}
