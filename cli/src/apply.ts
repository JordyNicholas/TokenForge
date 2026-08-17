import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ProviderId, TokenRiskReport } from "@tokenforge/risk-core";
import { getAdapter, type PolicyFile } from "./adapters";
import { RuntimeError } from "./errors";
import { scanReportPath } from "./paths";
import {
  tryReadScanReport,
  writeScanReport,
} from "./report-file";
import { parseProviderId, scanRepo } from "./scan";

export type ApplyOptions = {
  root: string;
  provider?: string;
  dryRun?: boolean;
  team?: string;
  repo?: string;
  /** When set (init), skip a second walk. */
  report?: TokenRiskReport;
};

export type ApplyResult = {
  report: TokenRiskReport;
  reportPath: string;
  files: PolicyFile[];
  dryRun: boolean;
};

function safePolicyPath(root: string, relativePath: string): string {
  if (isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new RuntimeError(`Refusing to write ${relativePath}`);
  }
  return join(root, relativePath);
}

async function writePolicyFile(root: string, file: PolicyFile): Promise<void> {
  const abs = safePolicyPath(root, file.path);
  try {
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, file.contents, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot write ${file.path}: ${reason}`);
  }
}

async function resolveReport(
  options: ApplyOptions,
  root: string,
  provider: ProviderId,
): Promise<TokenRiskReport> {
  if (options.report) {
    return { ...options.report, provider };
  }

  const existing = await tryReadScanReport(scanReportPath(root));
  if (existing) {
    return { ...existing, provider };
  }

  const scanned = await scanRepo({
    root,
    team: options.team,
    repo: options.repo,
    provider,
  });
  return { ...scanned.report, provider };
}

/**
 * Apply a provider policy pack from a scan report.
 * `--dry-run` prints planned files and does not write.
 */
export async function applyPolicy(options: ApplyOptions): Promise<ApplyResult> {
  const root = resolve(options.root);
  const provider = parseProviderId(options.provider ?? "copilot");
  const adapter = getAdapter(provider);
  const report = await resolveReport(options, root, provider);
  const files = adapter.render(report);
  const reportPath = scanReportPath(root);
  const dryRun = Boolean(options.dryRun);

  if (!dryRun) {
    await writeScanReport(reportPath, report);
    for (const file of files) {
      await writePolicyFile(root, file);
    }
  }

  return { report, reportPath, files, dryRun };
}

/** scan + apply. */
export async function initRepo(options: ApplyOptions): Promise<ApplyResult> {
  const provider = options.provider ?? "copilot";
  const scanned = await scanRepo({
    root: options.root,
    team: options.team,
    repo: options.repo,
    provider,
  });
  return applyPolicy({ ...options, provider, report: scanned.report });
}
