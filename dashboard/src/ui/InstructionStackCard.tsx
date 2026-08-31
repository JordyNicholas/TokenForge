import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { InstructionBudget } from "@tokenforge/risk-core";
import { formatTokens } from "../domain";

export type InstructionStackRow = {
  team: string;
  repo: string;
  budget: InstructionBudget;
};

export function InstructionStackCard({ rows }: { rows: InstructionStackRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {rows.map(({ team, repo, budget }) => {
        const overBudget = budget.alwaysOnTokens > budget.recommendedMax;
        return (
          <Alert
            key={`${team}:${repo}`}
            severity={overBudget ? "warning" : "info"}
            variant="outlined"
          >
            <AlertTitle>
              Instruction stack · {rows.length > 1 ? team : "always-on context"}
            </AlertTitle>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Estimated tokens from instruction and rules files the agent loads every turn.
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={`Stack: ${formatTokens(budget.alwaysOnTokens)}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Recommended ≤ ${formatTokens(budget.recommendedMax)}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${budget.files.length} file(s)`}
                variant="outlined"
              />
              {rows.length > 1 ? (
                <Chip size="small" label={repo} variant="outlined" />
              ) : null}
            </Stack>
          </Alert>
        );
      })}
    </Stack>
  );
}
