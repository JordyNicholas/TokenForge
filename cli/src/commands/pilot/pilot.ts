import {
  type ProveChangeMarker,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { applyPolicy, type ApplyResult } from "../apply/apply";
import { scanRepo } from "../scan/scan";
import { writeScanReport } from "../../io/report-file";

export type PilotPackOptions = {
  root: string;
  provider?: string;
  team?: string;
  repo?: string;
  dryRun?: boolean;
  /** When true, scan only — still writes the report for Prove. */
  skipApply?: boolean;
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
};

/**
 * Single-path org pilot: scan → local apply → Prove-ready report (#100).
 * Does not call remote org APIs (#99) — use `org-apply` separately when needed.
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
    return {
      report: scanned.report,
      reportPath: scanned.reportPath,
      apply: null,
      dryRun,
      steps: [...steps, "apply skipped"],
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

  return {
    report: applied.report,
    reportPath: applied.reportPath,
    apply: applied,
    changeMarker: applied.changeMarker,
    dryRun,
    steps,
  };
}
