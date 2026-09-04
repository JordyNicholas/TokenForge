import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  SAVINGS_TIERS,
  buildSavingsTierValues,
  compareUsagePeriods,
  type Assumptions,
  type GlossaryTermId,
  type SavingsTierId,
  type UsageMetrics,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { GlossaryTip } from "./GlossaryTip";

const TIER_GLOSSARY: Record<SavingsTierId, GlossaryTermId> = {
  "live-hygiene": "live-hygiene",
  "scan-delta": "scan-delta",
  "projected-usd": "scenario-usd",
  "imported-bill": "bill-reconcile",
};

export function HonestSavingsTiers({
  hasScan,
  totals,
  assumptions,
  usage,
  teamId,
}: {
  hasScan: boolean;
  totals: TokenRiskTotals;
  assumptions: Assumptions;
  usage: UsageMetrics | null | undefined;
  teamId: string | null;
}) {
  const {
    compareBaselineUsage,
    compareAfterUsage,
    compareAssumptionsFreeze,
    sessionStats,
  } = useDashboard();

  const baselineUsage = compareBaselineUsage ?? usage ?? null;
  const afterUsage = compareAfterUsage ?? null;

  const compare =
    baselineUsage && afterUsage
      ? compareUsagePeriods({
          baselineUsage,
          afterUsage,
          teamId,
          baselineTotals: totals,
          liveAssumptions: assumptions,
          frozenAssumptions: compareAssumptionsFreeze,
        })
      : null;

  const values = buildSavingsTierValues({
    hasScan,
    totals,
    assumptions,
    compare,
    usage: baselineUsage,
    teamId,
    sessionAvoidedTokens: sessionStats?.sessionAvoidedTokens ?? null,
  });

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" component="h2">
          Savings signals
        </Typography>
        <GlossaryTip term="Honest tiers" termId="honest-tiers" />
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
        aria-label="Honest savings tiers"
      >
        {SAVINGS_TIERS.map((tier) => {
          const display = values[tier.id];
          return (
            <Stack
              key={tier.id}
              spacing={0.5}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                minHeight: 96,
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: display.available ? "primary.main" : "action.selected",
                    color: display.available ? "primary.contrastText" : "text.secondary",
                    flexShrink: 0,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                  }}
                >
                  {tier.order}
                </Box>
                <GlossaryTip term={tier.label} termId={TIER_GLOSSARY[tier.id]} />
              </Stack>
              <Typography
                variant="h6"
                component="p"
                color={display.available ? "primary" : "text.secondary"}
                sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
              >
                {display.value}
              </Typography>
              {display.hint ? (
                <Typography variant="caption" color="text.secondary">
                  {display.hint}
                </Typography>
              ) : null}
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}
