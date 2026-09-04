import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  SAVINGS_TIERS,
  SAVINGS_TIERS_DILUTION_NOTE,
  buildSavingsTierValues,
  compareUsagePeriods,
  type Assumptions,
  type UsageMetrics,
} from "../domain";
import { useDashboard } from "../state/DashboardProvider";
import { GlossaryTip } from "./GlossaryTip";

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
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: "center", mb: 1 }}
      >
        <Typography variant="subtitle2" component="h2">
          How savings work
        </Typography>
        <GlossaryTip
          term="Honest tiers"
          definition="Four labeled signals from live Filter hygiene through billed usage. Higher tiers reconcile estimates — they do not prove causation without cohort controls."
        />
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
                minHeight: 120,
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
                <GlossaryTip term={tier.label} definition={tier.shortHonesty} />
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
      <Alert severity="info" variant="outlined" icon={<InfoOutlined fontSize="inherit" />} sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {SAVINGS_TIERS_DILUTION_NOTE} Cohort tags reduce “was that TokenForge?” noise — they do
          not prove 100% of an invoice delta was caused by TokenForge.
        </Typography>
      </Alert>
    </Box>
  );
}
