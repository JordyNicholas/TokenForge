import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  ARCHITECTURE_LABELS,
  architectureForTeam,
  boardScopeBase,
  tokenSavedPercent,
} from "../domain";
import { useLayerView } from "../state/useLayerView";
import { heatFill, resolveColorMode } from "../theme/heat";
import { EmptyState } from "../ui/EmptyState";
import { GlossaryTip } from "../ui/GlossaryTip";
import { HeatCell } from "../ui/HeatCell";
import { Page } from "../ui/Page";
import { PrivacyControls } from "../ui/PrivacyControls";

export function HeatmapPage() {
  const navigate = useNavigate();
  const { seed, reports, boardLayer, teamId, scopeLabel } = useLayerView();
  const { mode, systemMode } = useColorScheme();
  const resolved = resolveColorMode(mode, systemMode);

  return (
    <Page
      title={`Team heatmap · ${scopeLabel}`}
      lead={
        <GlossaryTip term="Exclusion ratio" termId="exclusion-ratio" />
      }
    >
      <PrivacyControls />

      {reports.length === 0 ? (
        <EmptyState
          title="No teams to heat-map"
          body="Load a multi-team seed or a single Token Risk report to see exclusion heat by team."
        />
      ) : (
        <>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ maxWidth: 28 * 16, alignItems: "center" }}
          >
            <Typography variant="caption" color="text.secondary">
              Low waste
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: 10,
                borderRadius: 99,
                background: `linear-gradient(90deg, ${heatFill(0, resolved)}, ${heatFill(100, resolved)})`,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              High waste
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
              gap: 2,
            }}
          >
            {reports.map((report) => {
              const arch = architectureForTeam(report.team, seed?.architectures);
              return (
                <HeatCell
                  key={`${report.team}:${report.repo}`}
                  team={
                    arch
                      ? `${report.team} · ${ARCHITECTURE_LABELS[arch]}`
                      : report.team
                  }
                  repo={report.repo}
                  percent={tokenSavedPercent(report.totals)}
                  savedTokens={report.totals.savedTokens}
                  selected={report.team === teamId}
                  onSelect={() => navigate(boardScopeBase(boardLayer, report.team))}
                />
              );
            })}
          </Box>
          {teamId ? (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Link
                component={RouterLink}
                to={boardScopeBase(boardLayer, null)}
                underline="hover"
              >
                ← Back to global BU heatmap
              </Link>
            </Typography>
          ) : null}
        </>
      )}
    </Page>
  );
}
