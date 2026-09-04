import { resolve } from "node:path";
import {
  type ProveChangeMarker,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { applyPolicy, type ApplyResult } from "../apply/apply";
import { scanRepo } from "../scan/scan";
import { writeScanReport } from "../../io/report-file";
import {
  stageProveArtifactsForDashboard,
  writeProveHandoff,
  type ProveHandoff,
} from "../../io/prove-handoff";

export type PilotPackOptions = {
  root: string;
  provider?: string;
  team?: string;
  repo?: string;
  dryRun?: boolean;
  /** When true, scan only — still writes the report for Prove. */
  skipApply?: boolean;
  /** Write Prove handoff + stage dashboard/public artifacts. */
  prove?: boolean;
  /** Override dashboard public dir (default: <root>/dashboard/public). */
  dashboardPublicDir?: string;
  dashboardBaseUrl?: string;
  mode?: string;
  llm?: string;
  llmEndpoint?: string;
  llmTimeout?: string;
  externalDataConsent?: boolean;
};

export type PilotPackResult = {
  report: TokenRiskReport;
  reportPath: string;
  apply: ApplyResult | null;
  changeMarker?: ProveChangeMarker;
  dryRun: boolean;
  steps: string[];
  handoff?: ProveHandoff;
  staged?: string[];
};

async function maybeProveHandoff(
  options: PilotPackOptions,
  report: TokenRiskReport,
  changeMarker: ProveChangeMarker | undefined,
  dryRun: boolean,
  steps: string[],
): Promise<{ handoff?: ProveHandoff; staged?: string[] }> {
  if (!options.prove || dryRun) {
    return {};
  }
  const handoff = await writeProveHandoff({
    root: options.root,
    report,
    changeMarker,
    dashboardBaseUrl: options.dashboardBaseUrl,
  });
  steps.push(`prove handoff → ${handoff.dashboardUrlHint}`);
  const publicDir =
    options.dashboardPublicDir ?? resolve(options.root, "dashboard/public");
  try {
    const staged = await stageProveArtifactsForDashboard({
      root: options.root,
      dashboardPublicDir: publicDir,
    });
    if (staged.length > 0) {
      steps.push(`staged dashboard/public: ${staged.join(", ")}`);
    }
    return { handoff, staged };
  } catch {
    steps.push("dashboard staging skipped (public dir unavailable)");
    return { handoff };
  }
}

/**
 * Single-path org pilot: scan → local apply → Prove-ready report (#100).
 * Does not call remote org APIs (#99) — use `org-apply` separately when needed.
 * `--prove` writes handoff JSON and stages dashboard/public for query-param boot.
 */
export async function runPilotPack(
  options: PilotPackOptions,
): Promise<PilotPackResult> {
  const dryRun = Boolean(options.dryRun);
  const steps: string[] = [];

  const scanned = await scanRepo({
    root: options.root,
    team: options.team,
    repo: options.repo,
    provider: options.provider ?? "copilot",
    mode: options.mode,
    llm: options.llm,
    llmEndpoint: options.llmEndpoint,
    llmTimeout: options.llmTimeout,
    externalDataConsent: options.externalDataConsent,
  });
  await writeScanReport(scanned.reportPath, scanned.report);
  steps.push(`scan → ${scanned.reportPath}`);

  if (options.skipApply) {
    steps.push("apply skipped");
    const prove = await maybeProveHandoff(
      options,
      scanned.report,
      undefined,
      dryRun,
      steps,
    );
    return {
      report: scanned.report,
      reportPath: scanned.reportPath,
      apply: null,
      dryRun,
      steps,
      ...prove,
    };
  }

  const applied = await applyPolicy({
    root: options.root,
    provider: options.provider ?? "copilot",
    team: options.team,
    repo: options.repo,
    dryRun,
    report: scanned.report,
  });
  steps.push(
    dryRun
      ? `apply dry-run (${applied.files.length} files)`
      : `apply → ${applied.files.length} policy file(s)`,
  );
  if (applied.changeMarker) {
    steps.push(`change marker ${applied.changeMarker.packId}`);
  }
  if (!dryRun && !options.skipApply) {
    steps.push(`next: tokenforge discover . → .tokenforge/discover-latest.json`);
  }

  const prove = await maybeProveHandoff(
    options,
    applied.report,
    applied.changeMarker,
    dryRun,
    steps,
  );

  return {
    report: applied.report,
    reportPath: applied.reportPath,
    apply: applied,
    changeMarker: applied.changeMarker,
    dryRun,
    steps,
    ...prove,
  };
}
