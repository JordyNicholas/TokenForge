import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  discoverMissedOpportunities,
  isProveChangeMarker,
  isTokenRiskReport,
  missedOpportunityTokens,
  type DiscoverOpportunity,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { exclusionPathForProvider } from "../../adapters";
import { RuntimeError } from "../../app/errors";
import { readActivePathsFile } from "../../io/active-paths-file";
import { parseExclusionYaml } from "../../io/exclusion-file";
import { discoverLatestPath, proveChangeLatestPath, scanReportPath, tokenforgeDir } from "../../io/paths";
import { tryReadScanReport } from "../../io/report-file";
import { parseProviderId, scanRepo } from "../scan/scan";

export type DiscoverOptions = {
  root: string;
  provider?: string;
  team?: string;
  repo?: string;
  /** Use this report instead of `.tokenforge/scan-report.json`. */
  reportPath?: string;
  /** Force a fresh repo scan. */
  rescan?: boolean;
  activePathsFile?: string;
  mode?: string;
  llm?: string;
  llmEndpoint?: string;
  llmTimeout?: string;
  externalDataConsent?: boolean;
  /** Write `.tokenforge/discover-latest.json` for Prove handoff. */
  writeReport?: boolean;
};

export type DiscoverResult = {
  report: TokenRiskReport;
  reportPath: string;
  opportunities: DiscoverOpportunity[];
  missedTokens: number;
  exclusionPath: string;
  appliedPatterns: string[];
  hasApplyMarker: boolean;
  discoverReportPath?: string;
};

async function mergeActivePaths(
  report: TokenRiskReport,
  activePathsFile: string | undefined,
): Promise<TokenRiskReport> {
  if (!activePathsFile) {
    return report;
  }
  const activePaths = await readActivePathsFile(activePathsFile);
  const merged = [...new Set([...(report.activePaths ?? []), ...activePaths])];
  return merged.length > 0
    ? { ...report, activePaths: merged.sort((a, b) => a.localeCompare(b)) }
    : report;
}

async function loadAppliedPatterns(
  root: string,
  exclusionRel: string,
): Promise<string[]> {
  try {
    const contents = await readFile(join(root, exclusionRel), "utf8");
    return parseExclusionYaml(contents);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot read ${exclusionRel}: ${reason}`);
  }
}

async function resolveReport(options: DiscoverOptions): Promise<{
  report: TokenRiskReport;
  reportPath: string;
}> {
  const root = resolve(options.root);
  const provider = parseProviderId(options.provider ?? "copilot");
  const defaultReportPath = options.reportPath
    ? resolve(options.reportPath)
    : scanReportPath(root);

  if (!options.rescan) {
    if (options.reportPath) {
      const raw = JSON.parse(
        await readFile(resolve(options.reportPath), "utf8"),
      ) as unknown;
      if (!isTokenRiskReport(raw)) {
        throw new RuntimeError(`Not a Token Risk report: ${options.reportPath}`);
      }
      const report = await mergeActivePaths(
        { ...raw, provider },
        options.activePathsFile,
      );
      return { report, reportPath: resolve(options.reportPath) };
    }

    const existing = await tryReadScanReport(defaultReportPath);
    if (existing) {
      const report = await mergeActivePaths(
        { ...existing, provider },
        options.activePathsFile,
      );
      return { report, reportPath: defaultReportPath };
    }
  }

  const scanned = await scanRepo({
    root,
    team: options.team,
    repo: options.repo,
    provider,
    mode: options.mode,
    llm: options.llm,
    llmEndpoint: options.llmEndpoint,
    llmTimeout: options.llmTimeout,
    externalDataConsent: options.externalDataConsent,
    activePathsFile: options.activePathsFile,
  });
  return { report: scanned.report, reportPath: scanned.reportPath };
}

/** Compare scan findings to on-disk exclusion YAML (#170). */
export async function runDiscover(options: DiscoverOptions): Promise<DiscoverResult> {
  const root = resolve(options.root);
  const provider = parseProviderId(options.provider ?? "copilot");
  const { report, reportPath } = await resolveReport(options);
  const exclusionPath = exclusionPathForProvider(provider);
  const appliedPatterns = await loadAppliedPatterns(root, exclusionPath);
  const opportunities = discoverMissedOpportunities(report, appliedPatterns);

  let hasApplyMarker = false;
  try {
    const raw = JSON.parse(
      await readFile(proveChangeLatestPath(root), "utf8"),
    ) as unknown;
    hasApplyMarker = isProveChangeMarker(raw);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      const reason = error instanceof Error ? error.message : String(error);
      throw new RuntimeError(`Cannot read prove-change-latest.json: ${reason}`);
    }
  }

  return {
    report,
    reportPath,
    opportunities,
    missedTokens: missedOpportunityTokens(opportunities),
    exclusionPath,
    appliedPatterns,
    hasApplyMarker,
    discoverReportPath: options.writeReport
      ? await writeDiscoverReport(root, {
          timestamp: new Date().toISOString(),
          sourceReportPath: reportPath,
          exclusionPath,
          appliedPatterns,
          hasApplyMarker,
          missedTokens: missedOpportunityTokens(opportunities),
          opportunities,
        })
      : undefined,
  };
}

async function writeDiscoverReport(
  root: string,
  payload: Record<string, unknown>,
): Promise<string> {
  await mkdir(tokenforgeDir(root), { recursive: true });
  const path = discoverLatestPath(root);
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}
