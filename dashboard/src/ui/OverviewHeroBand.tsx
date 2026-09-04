import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router-dom";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  boardScopeBase,
  formatPercent,
  formatTokens,
  formatUsd,
  type Projection,
  type ScanLayerId,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { GlossaryTip } from "./GlossaryTip";

/**
 * Above-the-fold analytical hero (Uxcel): 3–4 decision KPIs, clickable into
 * Findings / Variance / Assumptions. Keeps Prove honesty — estimated ≠ billed.
 */
export function OverviewHeroBand({
  boardLayer,
  teamId,
  totals,
  projection,
  hasScan,
}: {
  boardLayer: ScanLayerId;
  teamId: string | null;
  totals: TokenRiskTotals;
  projection: Projection;
  hasScan: boolean;
}) {
  const navigate = useNavigate();
  const { sessionStats, compareBaselineUsage, compareAfterUsage } = useDashboard();
  const base = boardScopeBase(boardLayer, teamId);

  const hygiene =
    sessionStats !== null
      ? formatTokens(sessionStats.sessionAvoidedTokens)
      : "—";
  const scanSaved = hasScan ? formatTokens(totals.savedTokens) : "—";
  const scenarioUsd = hasScan ? `${formatUsd(projection.monthlyUsdSaved)}/mo` : "—";
  const scenarioPct = hasScan ? formatPercent(projection.scenarioSavedPercent) : "";
  const hasBillCompare = Boolean(compareBaselineUsage && compareAfterUsage);

  const tiles: Array<{
    label: string;
    value: string;
    hint: string;
    to: string;
  }> = [
    {
      label: "Live hygiene",
      value: hygiene,
      hint: sessionStats
        ? "Session Filter/Shield estimate"
        : "Load session-stats.json",
      to: base,
    },
    {
      label: "Scan tokens avoided",
      value: scanSaved,
      hint: "Repo scan / apply delta",
      to: `${base}/findings`,
    },
    {
      label: "Scenario $",
      value: scenarioUsd,
      hint: scenarioPct ? `${scenarioPct} under Assumptions` : "Needs scan + Assumptions",
      to: `${base}/assumptions`,
    },
    {
      label: "Bill reconcile",
      value: hasBillCompare ? "Ready" : "Import usage",
      hint: hasBillCompare
        ? "Open Variance for estimate vs billed"
        : "Baseline + after-period usage",
      to: `${base}/variance`,
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1.5 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          Prove at a glance
        </Typography>
        <GlossaryTip
          term="Analytical Overview"
          definition="Primary FinOps signals first. Click a tile to investigate. Estimated avoided context is not an invoice delta."
        />
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            md: "repeat(4, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            variant="outlined"
            sx={{
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
          >
            <CardActionArea
              onClick={() => navigate(tile.to)}
              sx={{ p: 2, height: "100%", alignItems: "flex-start" }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {tile.label}
              </Typography>
              <Typography variant="h5" component="p" sx={{ fontWeight: 700, my: 0.5 }}>
                {tile.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tile.hint}
              </Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
