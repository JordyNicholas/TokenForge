import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Close from "@mui/icons-material/Close";
import ContentCopy from "@mui/icons-material/ContentCopy";
import {
  explainFinding,
  resolveSuggestion,
  type TokenRiskFinding,
} from "@tokenforge/risk-core";
import { useEffect, useState } from "react";
import {
  ACTION_LABELS,
  SOURCE_LABELS,
  SUGGESTION_KIND_LABELS,
  formatPercent,
  formatTokens,
} from "../domain";

export type FindingDetail = TokenRiskFinding & {
  team: string;
  repo: string;
};

export function FindingDetailDrawer({
  finding,
  onClose,
}: {
  finding: FindingDetail | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const explanation = finding ? explainFinding(finding) : null;
  const suggestion = finding ? resolveSuggestion(finding) : null;

  useEffect(() => {
    setCopied(false);
  }, [finding?.path, finding?.team]);
  const counted =
    finding !== null &&
    (finding.action === "excluded" || finding.action === "filtered");

  const copySummary = async () => {
    if (!suggestion) {
      return;
    }
    try {
      await navigator.clipboard.writeText(suggestion.summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={Boolean(finding)}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 } } } }}
    >
      {finding && explanation && suggestion ? (
        <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Finding
              </Typography>
              <Typography variant="h6" sx={{ wordBreak: "break-all" }}>
                {finding.path}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {finding.team} · {finding.repo}
              </Typography>
            </Box>
            <IconButton aria-label="Close finding" onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
            <Chip
              size="small"
              label={SOURCE_LABELS[finding.source ?? "heuristic"]}
              variant="outlined"
            />
            <Chip size="small" label={finding.reason} variant="outlined" />
            <Chip
              size="small"
              color={counted ? "default" : "warning"}
              label={ACTION_LABELS[finding.action]}
            />
          </Stack>

          <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
            <Stat label="Tokens" value={formatTokens(finding.estTokens)} />
            <Stat label="Bytes" value={formatTokens(finding.bytes)} />
            {finding.confidence !== undefined ? (
              <Stat label="Confidence" value={formatPercent(finding.confidence * 100)} />
            ) : null}
          </Stack>

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Why this is waste
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {explanation.explanation}
            </Typography>
            {explanation.detail ? (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                {explanation.detail}
              </Typography>
            ) : null}
          </Box>

          <Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 1, alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography variant="subtitle2">Suggested change</Typography>
              <Chip size="small" label={SUGGESTION_KIND_LABELS[suggestion.kind]} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {suggestion.summary}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={() => {
                void copySummary();
              }}
            >
              {copied ? "Copied" : "Copy advice"}
            </Button>
          </Box>

          <Alert severity="info" variant="outlined">
            TokenForge will not apply this. You decide whether to change the repo or run{" "}
            <code>tokenforge apply</code> for a policy pack (exclusions + lean instructions
            only).
          </Alert>
        </Box>
      ) : null}
    </Drawer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Stack>
  );
}
