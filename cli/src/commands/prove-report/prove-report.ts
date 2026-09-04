import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  isProveChangeMarker,
  isTokenRiskReport,
  isUsageMetrics,
  type ProveChangeMarker,
  type TokenRiskReport,
  type UsageMetrics,
} from "@tokenforge/risk-core";
import {
  proveChangeLatestPath,
  proveReportPath,
  scanReportPath,
  tokenforgeDir,
  usageLatestPath,
  usageMetricsPath,
} from "../../io/paths";

const HONESTY =
  "Fix-on vs control is billed usage compare for teams with vs without a Fix apply marker — not proof that TokenForge caused 100% of any invoice delta.";

/** Pitch-scenario constants mirroring dashboard DEFAULT_ASSUMPTIONS + ~30% waste share. */
const PITCH_USD_PER_M = 15;
const PITCH_PREMIUM_SHARE = 0.2;
const PITCH_PREMIUM_MULTIPLIER = 4;
const PITCH_WASTE_SHARE = 0.3;
const PITCH_TEAM_SIZE = 40;
const PITCH_MSGS_PER_DAY = 25;
const PITCH_DAYS_PER_MONTH = 21;
const PITCH_TOKENS_PER_MSG = 12_000;

type CalibrationBand = "strong" | "suggestive" | "weak" | "insufficient";
type CohortTrustLevel = "none" | "weak" | "strong";

export type ProveReportResult = {
  reportPath: string;
  markdown: string;
  outPath: string;
};

function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const rounded = abs >= 100 ? abs.toFixed(0) : abs.toFixed(2);
  return `$${rounded}`;
}

function formatSignedUsd(value: number): string {
  const abs = Math.abs(value);
  const rounded = abs >= 100 ? abs.toFixed(0) : abs.toFixed(2);
  return `${value >= 0 ? "+" : "−"}$${rounded}`;
}

function pitchEstimatedReductionUsd(savedTokens: number): number {
  const blendedRate =
    PITCH_USD_PER_M * (1 - PITCH_PREMIUM_SHARE + PITCH_PREMIUM_SHARE * PITCH_PREMIUM_MULTIPLIER);
  const monthlyTokensBefore =
    PITCH_TEAM_SIZE * PITCH_MSGS_PER_DAY * PITCH_DAYS_PER_MONTH * PITCH_TOKENS_PER_MSG;
  const exclusionRatio = monthlyTokensBefore > 0 ? savedTokens / monthlyTokensBefore : 0;
  const scenarioRatio = exclusionRatio * PITCH_WASTE_SHARE;
  return monthlyTokensBefore * scenarioRatio * (blendedRate / 1_000_000);
}

function cohortTrustLevel(input: {
  hasFixOn: boolean;
  controlTeamCount: number;
}): CohortTrustLevel {
  if (!input.hasFixOn) {
    return "none";
  }
  if (input.controlTeamCount === 0) {
    return "weak";
  }
  return "strong";
}

function estimateVsBilledBand(input: {
  estimatedReductionUsd: number;
  actualBilledChangeUsd: number;
  hasControlCohort: boolean;
  trustLevel: CohortTrustLevel;
}): { band: CalibrationBand; label: string; rationale: string } {
  const MIN_USD = 0.005;
  const { estimatedReductionUsd, actualBilledChangeUsd, hasControlCohort, trustLevel } =
    input;
  const aligns =
    estimatedReductionUsd > MIN_USD &&
    actualBilledChangeUsd > MIN_USD &&
    actualBilledChangeUsd > 0;
  const varianceUsd = actualBilledChangeUsd - estimatedReductionUsd;
  const hasEstimate = estimatedReductionUsd > MIN_USD;
  const hasActual = Math.abs(actualBilledChangeUsd) > MIN_USD;

  if (trustLevel === "none" || (!hasEstimate && !hasActual)) {
    return {
      band: "insufficient",
      label: "Insufficient evidence",
      rationale:
        "Load Fix markers, baseline + after billed usage, and freeze Assumptions in the dashboard before treating estimate vs bill as calibrated.",
    };
  }
  if (
    hasControlCohort &&
    trustLevel === "strong" &&
    aligns &&
    actualBilledChangeUsd >= estimatedReductionUsd * 0.25
  ) {
    return {
      band: "strong",
      label: "Strong calibration (cohort-backed)",
      rationale: `Fix-on vs control trust is strong; billed Δ (${formatSignedUsd(actualBilledChangeUsd)}) aligns with pitch-scenario estimate (${formatUsd(estimatedReductionUsd)}). Still not 100% invoice causation.`,
    };
  }
  if (trustLevel === "weak" || !hasControlCohort) {
    return {
      band: "weak",
      label: "Weak calibration (no control)",
      rationale: hasControlCohort
        ? "Cohort trust is weak — relative Fix-on vs control billed Δ is not reliable."
        : "No control cohort — Fix-on billed movement alone cannot support strong calibration.",
    };
  }
  if (!aligns) {
    return {
      band: "weak",
      label: "Weak calibration (misaligned)",
      rationale: `Estimated reduction (${formatUsd(estimatedReductionUsd)}) and actual billed Δ (${formatSignedUsd(actualBilledChangeUsd)}) do not align — check periods and Assumptions freeze.`,
    };
  }
  return {
    band: "suggestive",
    label: "Suggestive calibration",
    rationale: `Movement aligns (estimate ${formatUsd(estimatedReductionUsd)}, actual ${formatSignedUsd(actualBilledChangeUsd)}, variance ${formatSignedUsd(varianceUsd)}). Not proof TokenForge caused the invoice delta.`,
  };
}

async function readJsonFile(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function discoverUsageSnapshots(root: string): Promise<UsageMetrics[]> {
  const dir = tokenforgeDir(root);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const periods = entries
    .map((name) => {
      const match = /^usage-(\d{4}-\d{2})\.json$/.exec(name);
      return match ? match[1]! : null;
    })
    .filter((period): period is string => period !== null)
    .sort((a, b) => a.localeCompare(b));

  const snapshots: UsageMetrics[] = [];
  for (const period of periods) {
    const raw = await readJsonFile(usageMetricsPath(root, period));
    if (raw && isUsageMetrics(raw)) {
      snapshots.push(raw);
    }
  }

  if (snapshots.length === 0) {
    const latestRaw = await readJsonFile(usageLatestPath(root));
    if (latestRaw && isUsageMetrics(latestRaw)) {
      snapshots.push(latestRaw);
    }
  }

  return snapshots;
}

function teamUsd(usage: UsageMetrics, team: string): number | null {
  const row = usage.teams.find((entry) => entry.team === team);
  return row?.estimatedUsd ?? null;
}

function usageVarianceSection(input: {
  report: TokenRiskReport;
  marker: ProveChangeMarker | null;
  snapshots: UsageMetrics[];
}): { section: string; estimatedReductionUsd: number; actualBilledChangeUsd: number; trustLevel: CohortTrustLevel; hasControlCohort: boolean } {
  const { report, marker, snapshots } = input;
  if (snapshots.length < 2) {
    const hint =
      snapshots.length === 1
        ? `_One usage snapshot (\`${snapshots[0]!.period}\`) — import or sync a second billing period for variance._`
        : "_No local usage snapshots — import baseline + after-period usage or run `usage-sync`._";
    return {
      section: `## Billed usage reconcile

${hint}

Scenario $ uses editable Assumptions in the dashboard — this CLI report uses a pitch-scenario estimate when usage is incomplete.`,
      estimatedReductionUsd: pitchEstimatedReductionUsd(report.totals.savedTokens),
      actualBilledChangeUsd: 0,
      trustLevel: marker ? "weak" : "none",
      hasControlCohort: false,
    };
  }

  const baseline = snapshots[0]!;
  const after = snapshots[snapshots.length - 1]!;
  const team = report.team;
  const baselineUsd = teamUsd(baseline, team) ?? baseline.totals.estimatedUsd;
  const afterUsd = teamUsd(after, team) ?? after.totals.estimatedUsd;
  const actualBilledChangeUsd = baselineUsd - afterUsd;
  const estimatedReductionUsd = pitchEstimatedReductionUsd(report.totals.savedTokens);
  const varianceUsd = actualBilledChangeUsd - estimatedReductionUsd;

  const fixOnTeam = marker?.team ?? team;
  const fixOnSet = new Set([fixOnTeam]);
  const allTeams = new Set([
    ...baseline.teams.map((row) => row.team),
    ...after.teams.map((row) => row.team),
  ]);
  const controlTeams = [...allTeams].filter((label) => !fixOnSet.has(label));
  const hasControlCohort = controlTeams.length > 0;
  const trustLevel = cohortTrustLevel({
    hasFixOn: Boolean(marker),
    controlTeamCount: controlTeams.length,
  });

  const periodWarning =
    baseline.period !== after.period
      ? `\n_Period pair: ${baseline.period} → ${after.period}._`
      : "";

  return {
    section: `## Billed usage reconcile

| Metric | Value |
| --- | --- |
| Baseline period | ${baseline.period} (${baseline.providerLabel}) |
| After period | ${after.period} (${after.providerLabel}) |
| Baseline billed $ | ${formatUsd(baselineUsd)} |
| After billed $ | ${formatUsd(afterUsd)} |
| Actual billed change | ${formatSignedUsd(actualBilledChangeUsd)} |
| Pitch-scenario estimate | ${formatUsd(estimatedReductionUsd)} |
| Variance (actual − estimate) | ${formatSignedUsd(varianceUsd)} |

_Fix-on team: **${fixOnTeam}** · Control teams: ${controlTeams.length > 0 ? controlTeams.join(", ") : "— (none)"}${periodWarning}

Reconcile in the dashboard Variance board for frozen Assumptions and full cohort compare.`,
    estimatedReductionUsd,
    actualBilledChangeUsd,
    trustLevel,
    hasControlCohort,
  };
}

/**
 * Director-forwardable Markdown Prove report from local .tokenforge artifacts.
 * Honesty: estimated ≠ billed causation.
 */
export async function writeProveReport(options: {
  root: string;
  outPath?: string;
}): Promise<ProveReportResult> {
  const root = resolve(options.root);
  const reportFile = scanReportPath(root);
  const raw = await readFile(reportFile, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isTokenRiskReport(parsed)) {
    throw new Error(`${reportFile} is not a Token Risk report.`);
  }
  const report: TokenRiskReport = parsed;

  let marker: ProveChangeMarker | null = null;
  const markerRaw = await readJsonFile(proveChangeLatestPath(root));
  if (markerRaw && isProveChangeMarker(markerRaw)) {
    marker = markerRaw;
  }

  const snapshots = await discoverUsageSnapshots(root);
  const usage = usageVarianceSection({ report, marker, snapshots });
  const calibration = estimateVsBilledBand({
    estimatedReductionUsd: usage.estimatedReductionUsd,
    actualBilledChangeUsd: usage.actualBilledChangeUsd,
    hasControlCohort: usage.hasControlCohort,
    trustLevel: usage.trustLevel,
  });

  const savedPct =
    report.totals.beforeTokens > 0
      ? (100 * report.totals.savedTokens) / report.totals.beforeTokens
      : 0;

  const markdown = `# TokenForge Prove report

Generated: ${new Date().toISOString()}  
Team: **${report.team}** · Repo: **${report.repo}** · Provider: **${report.provider}**

## Estimated scan savings

| Metric | Value |
| --- | --- |
| Before tokens | ${formatTokens(report.totals.beforeTokens)} |
| After tokens | ${formatTokens(report.totals.afterTokens)} |
| Saved tokens | ${formatTokens(report.totals.savedTokens)} |
| Scan exclusion | ${savedPct.toFixed(1)}% |

## Fix attribution

${
  marker
    ? `- Pack: \`${marker.packId}\`  
- Action: ${marker.action}  
- Timestamp: ${marker.timestamp}  
- Team: ${marker.team ?? report.team}`
    : "_No Prove change marker found. Run \`tokenforge apply\` or \`tokenforge pilot\`._"
}

${usage.section}

## Trust & cohort

- Cohort trust: **${usage.trustLevel}**
- Control cohort: ${usage.hasControlCohort ? "yes" : "no"}
- ${HONESTY}

## Calibration

- Band: **${calibration.band}** — ${calibration.label}
- ${calibration.rationale}

## Honesty

${HONESTY}

Estimated avoided context is **not** an invoice causation claim. Cohort Fix-on vs control reduces noise; it does not prove 100% of any billed delta was caused by TokenForge.

---
_Local-first TokenForge Prove — forward this Markdown to FinOps._
`;

  const outPath = resolve(options.outPath ?? proveReportPath(root));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, markdown, "utf8");
  return { reportPath: reportFile, markdown, outPath };
}
