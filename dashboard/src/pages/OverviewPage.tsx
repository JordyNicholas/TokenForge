import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  ARCHITECTURE_LABELS,
  SCAN_LAYER_LABELS,
  SCAN_LAYER_LEADS,
  architectureForTeam,
  boardScopeBase,
  displayPath,
  formatPercent,
  formatTokens,
  formatUsd,
  getLlmAnalysisOverview,
  listHybridScanSummaries,
  seedHasLlmLayer,
  tokenSavedPercent,
  tokensByArchitecture,
} from "../domain";
import { useLayerView } from "../state/useLayerView";
import { AfterFixCompareCard } from "../ui/AfterFixCompareCard";
import { ArchitectureChart } from "../ui/ArchitectureChart";
import { ChartCard } from "../ui/ChartCard";
import { DataTable } from "../ui/DataTable";
import { DemoOnboardingBanner } from "../ui/DemoOnboardingBanner";
import { EmptyState } from "../ui/EmptyState";
import { FutureLeversCard } from "../ui/FutureLeversCard";
import { GlossaryTip } from "../ui/GlossaryTip";
import { HybridScanMetaCard } from "../ui/HybridScanMetaCard";
import { KpiCard, KpiRow } from "../ui/Kpi";
import { LlmAnalysisOverviewCard } from "../ui/LlmAnalysisOverviewCard";
import { MixChart } from "../ui/MixChart";
import { Page } from "../ui/Page";
import { PrivacyControls } from "../ui/PrivacyControls";
import { ProveStoryRail } from "../ui/ProveStoryRail";
import { SavingsChart } from "../ui/SavingsChart";
import { UsageMetricsCard } from "../ui/UsageMetricsCard";

export function OverviewPage() {
  const navigate = useNavigate();
  const {
    seed,
    reports,
    totals,
    projection,
    boardLayer,
    teamId,
    scopeLabel,
    redactPaths,
    assumptions,
    patchAssumptions,
    usageLabel,
  } = useLayerView();
  const llmBoardEmpty =
    boardLayer === "llm" &&
    reports.length > 0 &&
    reports.every((report) => report.findings.length === 0);
  const llmBoardUnavailable =
    boardLayer === "llm" && seed !== null && !seedHasLlmLayer(seed.reports);
  const llmOverviews =
    boardLayer === "llm"
      ? reports.flatMap((report) => {
          const overview = getLlmAnalysisOverview(report);
          return overview
            ? [{ team: report.team, repo: report.repo, overview }]
            : [];
        })
      : [];
  const hybridSummaries = listHybridScanSummaries(reports);
  const singleTeam = Boolean(teamId) || reports.length === 1;
  const archBuckets =
    !teamId && seed?.architectures
      ? tokensByArchitecture(reports, seed.architectures)
      : [];
  const openTeam = (team: string) => {
    navigate(boardScopeBase(boardLayer, team));
  };

  return (
    <Page
      title={`${seed?.businessUnit ?? "Business unit"} · ${scopeLabel}`}
      lead={
        <>
          {SCAN_LAYER_LEADS[boardLayer]}{" "}
          <GlossaryTip
            term={SCAN_LAYER_LABELS[boardLayer]}
            definition={
              boardLayer === "combined"
                ? "Merged heuristic + LLM findings used by Fix adapters."
                : boardLayer === "heuristic"
                  ? "Deterministic baseline from size, path class, and inactivity."
                  : "Optional semantic enrichment from a hybrid scan."
            }
          />
        </>
      }
    >
      <DemoOnboardingBanner />
      <ProveStoryRail />
      <PrivacyControls showNote />

      <UsageMetricsCard usage={seed?.usage} teamId={teamId} usageLabel={usageLabel} />

      <Alert severity="success" variant="outlined">
        Under your assumptions, about{" "}
        <strong>{formatPercent(projection.scenarioSavedPercent)}</strong> of estimated
        Chat/Agent tokens look like waste →{" "}
        <strong>{formatUsd(projection.monthlyUsdSaved)}</strong>/mo.{" "}
        <Link
          component={RouterLink}
          to={`${boardScopeBase(boardLayer, teamId)}/assumptions`}
          underline="hover"
        >
          Adjust Assumptions
        </Link>{" "}
        (scan exclusion {formatPercent(projection.tokenSavedPercent)} × waste applicability).
      </Alert>

      <AfterFixCompareCard beforeTotals={totals} />
      <HybridScanMetaCard summaries={hybridSummaries} />
      {llmBoardUnavailable ? (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          No LLM layer in the loaded JSON. Run a hybrid scan (
          <code>--mode hybrid --llm ollama:…</code>) and load the report to populate this board.
        </Alert>
      ) : null}
      {llmBoardEmpty ? (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Hybrid scan ran, but the model did not flag any paths for exclusion. Try a smaller
          path (e.g. <code>docs/</code>) or increase <code>--llm-timeout</code> on slower hardware.
        </Alert>
      ) : null}
      {llmOverviews.map(({ team, repo, overview }) => (
        <LlmAnalysisOverviewCard
          key={`${team}:${repo}`}
          overview={overview}
          title={
            llmOverviews.length > 1
              ? `Model analysis · ${team}`
              : "Model analysis"
          }
        />
      ))}
      <KpiRow>
        <KpiCard
          label="Tokens saved"
          value={formatTokens(totals.savedTokens)}
          hint="Excluded or filtered from context"
        />
        <KpiCard
          label="$ saved / month"
          value={formatUsd(projection.monthlyUsdSaved)}
          hint="Live from Assumptions"
        />
        <KpiCard
          label="Scenario savings"
          value={formatPercent(projection.scenarioSavedPercent)}
          hint="Pitch figure on this seed"
        />
        <KpiCard
          label={singleTeam ? "Scope" : "Teams"}
          value={singleTeam ? "One team" : String(reports.length)}
          hint={
            singleTeam
              ? reports[0]?.repo ?? teamId ?? "Single report"
              : seed?.businessUnit ?? "Business unit"
          }
        />
      </KpiRow>

      {reports.length === 0 ? (
        <EmptyState
          title="No teams on this board"
          body="Load a Token Risk JSON from the CLI or extension, or switch scan board / team scope."
        />
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) minmax(0, 1fr)" },
            }}
          >
            <ChartCard
              title={teamId ? "Tokens for this team" : "Tokens by team"}
              subheader={
                teamId
                  ? "Team-scoped Prove"
                  : "Click a bar to open that team’s dashboard"
              }
            >
              <SavingsChart
                reports={reports}
                onSelectTeam={teamId ? undefined : openTeam}
              />
            </ChartCard>
            <ChartCard
              title="Saved vs remaining"
              subheader={teamId ? "Team roll-up" : "BU roll-up of scan totals"}
            >
              <MixChart totals={totals} />
            </ChartCard>
          </Box>

          {archBuckets.length > 0 ? (
            <ChartCard
              title="Saved tokens by architecture"
              subheader="Microservices, serverless, data platforms — same FinOps loop"
            >
              <ArchitectureChart buckets={archBuckets} />
            </ChartCard>
          ) : null}

          <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
              {singleTeam ? "Team detail" : "Teams in this business unit"}
            </Typography>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell>Architecture</TableCell>
                  <TableCell>Repo</TableCell>
                  <TableCell align="right">Before</TableCell>
                  <TableCell align="right">After</TableCell>
                  <TableCell align="right">Saved</TableCell>
                  <TableCell align="right">Scan %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => {
                  const arch = architectureForTeam(report.team, seed?.architectures);
                  return (
                    <TableRow
                      key={`${report.team}:${report.repo}`}
                      hover
                      onClick={() => openTeam(report.team)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>{report.team}</TableCell>
                      <TableCell>
                        {arch ? (
                          <Chip size="small" label={ARCHITECTURE_LABELS[arch]} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{displayPath(report.repo, redactPaths)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatTokens(report.totals.beforeTokens)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatTokens(report.totals.afterTokens)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatTokens(report.totals.savedTokens)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatPercent(tokenSavedPercent(report.totals))}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={3} sx={{ fontWeight: 600 }}>
                    {singleTeam ? "Total" : "BU total (global)"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatTokens(totals.beforeTokens)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatTokens(totals.afterTokens)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatTokens(totals.savedTokens)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatPercent(projection.tokenSavedPercent)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </DataTable>
            {!teamId ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Click a team to isolate Prove for that repository. Use Global in the sidebar for
                the estate-wide result.
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                <Link
                  component={RouterLink}
                  to={boardScopeBase(boardLayer, null)}
                  underline="hover"
                >
                  ← Back to global BU view
                </Link>
              </Typography>
            )}
          </Box>
        </>
      )}

      <Typography variant="h6" component="h2" sx={{ mt: 1 }}>
        Adjacent levers (do not pitch first)
      </Typography>
      <FutureLeversCard
        beforeTokens={totals.beforeTokens}
        assumptions={assumptions}
        projection={projection}
        onApplyPremiumShare={(share) => patchAssumptions({ premiumShare: share })}
      />

      <Alert severity="info" variant="outlined">
        Displayed $ uses editable assumptions (rate, team size, messages/day). Changing
        those knobs does not rewrite the scan JSON. Scan exclusion % comes from this board;
        scenario $ = exclusion × waste applicability.
      </Alert>
    </Page>
  );
}
