import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  compactionAdvice,
  routingAdvice,
  type Assumptions,
  type Projection,
} from "../domain";

/** F3 advisory panels — do not lead the pitch; heuristic tips only. */
export function FutureLeversCard({
  beforeTokens,
  assumptions,
  projection,
  onApplyPremiumShare,
}: {
  beforeTokens: number;
  assumptions: Assumptions;
  projection: Projection;
  onApplyPremiumShare?: (share: number) => void;
}) {
  const compact = compactionAdvice({
    beforeTokens,
    msgsPerDevPerDay: assumptions.msgsPerDevPerDay,
    tokensPerMessage: assumptions.tokensPerMessage,
  });
  const routing = routingAdvice(assumptions, projection);

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      <Alert severity={compact.severity} variant="outlined">
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {compact.title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {compact.detail}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Issue #25 · advisory only — no vendor chat access
        </Typography>
      </Alert>
      <Alert severity="info" variant="outlined">
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {routing.title}
          </Typography>
          <Typography variant="body2">{routing.detail}</Typography>
          {onApplyPremiumShare &&
          routing.suggestedPremiumShare !== assumptions.premiumShare ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onApplyPremiumShare(routing.suggestedPremiumShare)}
              sx={{ alignSelf: "flex-start" }}
            >
              Apply suggested premium mix (
              {(routing.suggestedPremiumShare * 100).toFixed(0)}%)
            </Button>
          ) : null}
          <Typography variant="caption" color="text.secondary">
            Issue #26 · not a live model router
          </Typography>
        </Stack>
      </Alert>
    </Box>
  );
}
