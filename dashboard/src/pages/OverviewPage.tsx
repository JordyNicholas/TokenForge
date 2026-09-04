import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  ARCHITECTURE_LABELS,
  SCAN_LAYER_LABELS,
  formatPercent,
  formatTokens,
  sessionStatsFromEntry,
  architectureForTeam,
  boardHasSavings,
  boardScopeBase,
  displayPath,
  enforcementBadgeLabel,
  enforcementChipColor,
  enforcementTierForProvider,
  getLlmAnalysisOverview,
  listHybridScanSummaries,
  getHybridDelta,
  getInstructionBudget,
  isComplementarityFailure,
  seedHasLlmLayer,
  tokenSavedPercent,
  tokensByArchitecture,
  type GlossaryTermId,
} from "../domain";
import type { ProviderId } from "@tokenforge/risk-core";
import { useLayerView } from "../state/useLayerView";
import { useDashboard } from "../state/DashboardProvider";
import { AdoptionMetricsCard } from "../ui/AdoptionMetricsCard";
import { ArchitectureChart } from "../ui/ArchitectureChart";
import { ChartCard } from "../ui/ChartCard";
import { DataTable } from "../ui/DataTable";
import { DemoOnboardingBanner } from "../ui/DemoOnboardingBanner";
import { EmptyState } from "../ui/EmptyState";
import { GlossaryTip } from "../ui/GlossaryTip";
import { HonestSavingsTiers } from "../ui/HonestSavingsTiers";
import { HybridScanMetaCard } from "../ui/HybridScanMetaCard";
import { HybridDeltaCard } from "../ui/HybridDeltaCard";
import { InstructionStackCard } from "../ui/InstructionStackCard";
import { LlmAnalysisOverviewCard } from "../ui/LlmAnalysisOverviewCard";
import { MixChart } from "../ui/MixChart";
import { OverviewHeroBand } from "../ui/OverviewHeroBand";
import { OverviewInvestigatePanel } from "../ui/OverviewInvestigatePanel";
import { OverviewSection } from "../ui/OverviewSection";
import { Page } from "../ui/Page";
import { PilotChecklist } from "../ui/PilotChecklist";
import { SavingsChart } from "../ui/SavingsChart";

const LAYER_GLOSSARY: Record<"combined" | "heuristic" | "llm", GlossaryTermId> = {
  combined: "combined-board",
  heuristic: "heuristic-board",
  llm: "llm-board",
};

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
  } = useLayerView();
  const {
    sessionStats,
    discoverLatest,
    fixOnTeams,
    sessionStatsEntries,
    discoverEntries,
    provePackCoverage,
  } = useDashboard();

  const multiSessionRows = sessionStatsEntries
    .map((entry) => {
      const stats = sessionStatsFromEntry(entry);
      return stats
        ? {
            team: entry.team,
            repo: entry.repo,
            filteredPercent: stats.atRiskTabsFilteredPercent ?? null,
            filterEventCount: stats.filterEventCount ?? null,
            avoidedTokens: stats.sessionAvoidedTokens,
          }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const showMultiSession = multiSessionRows.length > 1;
  const showMultiDiscover = discoverEntries.length > 1;

  const hasSavings = boardHasSavings(totals);
  const llmBoardEmpty =
    boardLayer === "llm" && reports.length > 0 && !hasSavings;
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
  const hybridDeltaRows = reports.flatMap((report) => {
    const delta = getHybridDelta(report);
    return delta ? [{ team: report.team, repo: report.repo, delta }] : [];
  });
  const instructionStackRows = reports.flatMap((report) => {
    const budget = getInstructionBudget(report);
    return budget ? [{ team: report.team, repo: report.repo, budget }] : [];
  });
  const complementarityFailures = reports.filter(isComplementarityFailure);
  const singleTeam = Boolean(teamId) || reports.length === 1;
  const archBuckets =
    !teamId && seed?.architectures
      ? tokensByArchitecture(reports, seed.architectures)
      : [];
  const openTeam = (team: string) => {
    navigate(boardScopeBase(boardLayer, team));
  };

  const investigateCount =
    hybridSummaries.length +
    hybridDeltaRows.length +
    instructionStackRows.length +
    llmOverviews.length;
  const hasInvestigateDetail =
    investigateCount > 0 ||
    llmBoardUnavailable ||
    llmBoardEmpty ||
    complementarityFailures.length > 0 ||
    discoverLatest !== null;

  const uniqueProviders =
    reports.length > 0
      ? ([...new Set(reports.map((report) => report.provider))] as ProviderId[])
      : [];
  const missingScanTeams = provePackCoverage?.missingScans ?? [];
  const missingSessionTeams = provePackCoverage?.missingSessions ?? [];
  const hasMissingSubmissions =
    missingScanTeams.length > 0 || missingSessionTeams.length > 0;
  const missingSubmissionParts: string[] = [];
  if (missingScanTeams.length > 0) {
    missingSubmissionParts.push(`scans: ${missingScanTeams.join(", ")}`);
  }
  if (missingSessionTeams.length > 0) {
    missingSubmissionParts.push(`sessions: ${missingSessionTeams.join(", ")}`);
  }

  return (
    <Page
      title={`${seed?.businessUnit ?? "Business unit"} · ${scopeLabel}`}
      lead={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={SCAN_LAYER_LABELS[boardLayer]}
            variant="outlined"
          />
          {uniqueProviders.map((provider) => {
            const tier = enforcementTierForProvider(provider);
            return (
              <Chip
                key={provider}
                size="small"
                label={enforcementBadgeLabel(provider)}
                color={enforcementChipColor(tier)}
                variant="outlined"
              />
            );
          })}
          <GlossaryTip
            term={SCAN_LAYER_LABELS[boardLayer]}
            termId={LAYER_GLOSSARY[boardLayer]}
          />
        </Stack>
      }
    >
      <DemoOnboardingBanner />
      <PilotChecklist />
      {hasMissingSubmissions ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Missing: {missingSubmissionParts.join(" · ")}
        </Alert>
      ) : null}
      <OverviewHeroBand
        boardLayer={boardLayer}
        teamId={teamId}
        totals={totals}
        projection={projection}
        hasScan={hasSavings}
      />

      <HonestSavingsTiers
        hasScan={hasSavings}
        totals={totals}
        assumptions={assumptions}
        usage={seed?.usage}
        teamId={teamId}
      />

      <AdoptionMetricsCard
        reports={reports}
        fixOnTeams={fixOnTeams}
        sessionFilteredPercent={sessionStats?.atRiskTabsFilteredPercent ?? null}
        sessionFilterEventCount={sessionStats?.filterEventCount ?? null}
      />

      {showMultiSession || showMultiDiscover || provePackCoverage ? (
        <OverviewSection title="Multi-team Prove">
          {provePackCoverage ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1.5 }}>
              {provePackCoverage.missingScans.length > 0 ? (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`missing scans: ${provePackCoverage.missingScans.join(", ")}`}
                />
              ) : null}
              {provePackCoverage.missingSessions.length > 0 ? (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`missing sessions: ${provePackCoverage.missingSessions.join(", ")}`}
                />
              ) : null}
            </Stack>
          ) : null}
          {showMultiSession ? (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Live hygiene by team
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 2 }}>
                {multiSessionRows.map((row) => (
                  <Chip
                    key={`${row.team}:${row.repo}`}
                    size="small"
                    variant="outlined"
                    label={`${row.team}: ${
                      row.filteredPercent !== null
                        ? formatPercent(row.filteredPercent)
                        : "—"
                    } filter · ${formatTokens(row.avoidedTokens)} avoided`}
                  />
                ))}
              </Stack>
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableCell>Team</TableCell>
                    <TableCell>Repo</TableCell>
                    <TableCell align="right">Filter %</TableCell>
                    <TableCell align="right">Events</TableCell>
                    <TableCell align="right">Avoided</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {multiSessionRows.map((row) => (
                    <TableRow key={`${row.team}:${row.repo}`}>
                      <TableCell>{row.team}</TableCell>
                      <TableCell>{row.repo}</TableCell>
                      <TableCell align="right">
                        {row.filteredPercent !== null
                          ? formatPercent(row.filteredPercent)
                          : "—"}
                      </TableCell>
                      <TableCell align="right">{row.filterEventCount ?? "—"}</TableCell>
                      <TableCell align="right">{formatTokens(row.avoidedTokens)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </>
          ) : null}
          {showMultiDiscover ? (
            <>
              <Typography variant="subtitle2" sx={{ mt: showMultiSession ? 2 : 0, mb: 1 }}>
                Discover policy_gap by team
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 2 }}>
                {discoverEntries.map((entry) => (
                  <Chip
                    key={`${entry.team}:${entry.repo}`}
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`${entry.team}: ${entry.summary.policyGapCount} policy_gap · ${formatTokens(entry.summary.missedTokens)} missed`}
                  />
                ))}
              </Stack>
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableCell>Team</TableCell>
                    <TableCell>Repo</TableCell>
                    <TableCell align="right">policy_gap</TableCell>
                    <TableCell align="right">session_kept</TableCell>
                    <TableCell align="right">Missed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {discoverEntries.map((entry) => (
                    <TableRow key={`${entry.team}:${entry.repo}`}>
                      <TableCell>{entry.team}</TableCell>
                      <TableCell>{entry.repo}</TableCell>
                      <TableCell align="right">{entry.summary.policyGapCount}</TableCell>
                      <TableCell align="right">{entry.summary.sessionKeptCount}</TableCell>
                      <TableCell align="right">
                        {formatTokens(entry.summary.missedTokens)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </>
          ) : null}
        </OverviewSection>
      ) : null}

      {hasInvestigateDetail ? (
        <OverviewSection
          title="Scan detail"
          titleAdornment={<GlossaryTip term="Investigate" termId="llm-board" />}
        >
          <OverviewInvestigatePanel
            summary={
              discoverLatest
                ? `Discover: ${discoverLatest.policyGapCount} policy_gap · ${formatTokens(discoverLatest.missedTokens)} missed.`
                : llmBoardEmpty
                  ? "Hybrid not run — switch to Combined for the full Detect picture."
                  : investigateCount > 0
                    ? `${investigateCount} hybrid / instruction detail row(s).`
                    : "Board notes for this layer."
            }
            badgeCount={(() => {
              const n = discoverLatest
                ? discoverLatest.policyGapCount + investigateCount
                : investigateCount;
              return n > 0 ? n : undefined;
            })()}
          >
            {discoverLatest ? (
              <Typography variant="body2" color="text.secondary">
                policy_gap: {discoverLatest.policyGapCount} · session_kept:{" "}
                {discoverLatest.sessionKeptCount} · missed ≈{" "}
                {formatTokens(discoverLatest.missedTokens)}. Run{" "}
                <code>tokenforge discover</code> / <code>tokenforge drift</code> locally.
              </Typography>
            ) : null}
            <HybridScanMetaCard summaries={hybridSummaries} />
            <HybridDeltaCard rows={hybridDeltaRows} />
            <InstructionStackCard rows={instructionStackRows} />
            {llmBoardUnavailable ? (
              <Typography variant="body2" color="text.secondary">
                Hybrid not run — switch to Combined for the full Detect picture.
              </Typography>
            ) : null}
            {llmBoardEmpty ? (
              <Typography variant="body2" color="text.secondary">
                Hybrid not run — switch to Combined for the full Detect picture.
                {complementarityFailures.length > 0
                  ? ` (complementarity: ${complementarityFailures[0]?.scan?.llm ? "see scan meta" : "llm_empty"})`
                  : ""}
              </Typography>
            ) : null}
            {llmOverviews.map(({ team, repo, overview }) => (
              <LlmAnalysisOverviewCard
                key={`${team}:${repo}`}
                overview={overview}
                title={
                  llmOverviews.length > 1 ? `Model analysis · ${team}` : "Model analysis"
                }
              />
            ))}
          </OverviewInvestigatePanel>
        </OverviewSection>
      ) : null}

      <OverviewSection title="Teams">
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
                subheader={teamId ? "Team-scoped Prove" : "Click a bar to open that team"}
              >
                <SavingsChart
                  reports={reports}
                  onSelectTeam={teamId ? undefined : openTeam}
                />
              </ChartCard>
              <ChartCard
                title="Saved vs remaining"
                subheader={teamId ? "Team roll-up" : "BU roll-up"}
              >
                <MixChart totals={totals} />
              </ChartCard>
            </Box>

            {archBuckets.length > 0 && hasSavings ? (
              <ChartCard
                title="Saved tokens by architecture"
                subheader="Same FinOps loop across styles"
              >
                <ArchitectureChart buckets={archBuckets} />
              </ChartCard>
            ) : null}

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
                    {singleTeam ? "Total" : "BU total"}
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
            {teamId ? (
              <Typography variant="body2">
                <Link
                  component={RouterLink}
                  to={boardScopeBase(boardLayer, null)}
                  underline="hover"
                >
                  ← Back to global BU view
                </Link>
              </Typography>
            ) : null}
          </>
        )}
      </OverviewSection>
    </Page>
  );
}
