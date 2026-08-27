import { resolve } from "node:path";
import { z } from "zod";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { applyPolicy, scanRepo, type ApplyResult } from "../commands";
import { writeScanReport } from "../io/report-file";

export type McpToolDeps = {
  scanRepo: typeof scanRepo;
  applyPolicy: typeof applyPolicy;
  writeScanReport: typeof writeScanReport;
  defaultRoot: () => string;
};

export const defaultMcpToolDeps = (): McpToolDeps => ({
  scanRepo,
  applyPolicy,
  writeScanReport,
  defaultRoot: () => process.cwd(),
});

export type TokenforgeScanArgs = {
  root?: string;
  team?: string;
  repo?: string;
  provider?: string;
  mode?: string;
  llm?: string;
  llmEndpoint?: string;
  llmTimeout?: string;
  allowExternal?: boolean;
  activePathsFile?: string;
};

export type TokenforgeApplyArgs = {
  root?: string;
  team?: string;
  repo?: string;
  provider?: string;
  dryRun?: boolean;
  mode?: string;
  llm?: string;
  llmEndpoint?: string;
  llmTimeout?: string;
  allowExternal?: boolean;
  activePathsFile?: string;
};

export type ScanToolPayload = {
  reportPath: string;
  totals: TokenRiskReport["totals"];
  findingsCount: number;
  scan: ScanMetadataPayload;
};

export type ScanMetadataPayload = {
  mode: NonNullable<TokenRiskReport["scan"]>["mode"];
  llm?: NonNullable<TokenRiskReport["scan"]>["llm"];
};

export type ApplyToolPayload = {
  reportPath: string;
  totals: TokenRiskReport["totals"];
  dryRun: boolean;
  writes: ApplyResult["writes"];
  changeMarker?: ApplyResult["changeMarker"];
};

function resolvedRoot(root: string | undefined, deps: McpToolDeps): string {
  return resolve(root?.trim() || deps.defaultRoot());
}

export async function handleTokenforgeScan(
  args: TokenforgeScanArgs,
  deps: McpToolDeps = defaultMcpToolDeps(),
): Promise<ScanToolPayload> {
  const result = await deps.scanRepo({
    root: resolvedRoot(args.root, deps),
    team: args.team,
    repo: args.repo,
    provider: args.provider,
    mode: args.mode,
    llm: args.llm,
    llmEndpoint: args.llmEndpoint,
    llmTimeout: args.llmTimeout,
    externalDataConsent: args.allowExternal,
    activePathsFile: args.activePathsFile,
  });
  await deps.writeScanReport(result.reportPath, result.report);
  const scan = result.report.scan ?? { mode: "heuristic" as const };

  return {
    reportPath: result.reportPath,
    totals: result.report.totals,
    findingsCount: result.report.findings.length,
    scan: {
      mode: scan.mode,
      llm: scan.llm,
    },
  };
}

export async function handleTokenforgeApply(
  args: TokenforgeApplyArgs,
  deps: McpToolDeps = defaultMcpToolDeps(),
): Promise<ApplyToolPayload> {
  const applied = await deps.applyPolicy({
    root: resolvedRoot(args.root, deps),
    team: args.team,
    repo: args.repo,
    provider: args.provider,
    dryRun: args.dryRun,
    mode: args.mode,
    llm: args.llm,
    llmEndpoint: args.llmEndpoint,
    llmTimeout: args.llmTimeout,
    externalDataConsent: args.allowExternal,
    activePathsFile: args.activePathsFile,
  });

  return {
    reportPath: applied.reportPath,
    totals: applied.report.totals,
    dryRun: applied.dryRun,
    writes: applied.writes,
    changeMarker: applied.changeMarker,
  };
}

export const tokenforgeScanInputSchema = {
  root: z.string().optional(),
  team: z.string().optional(),
  repo: z.string().optional(),
  provider: z.string().optional(),
  mode: z.string().optional(),
  llm: z.string().optional(),
  llmEndpoint: z.string().optional(),
  llmTimeout: z.string().optional(),
  allowExternal: z.boolean().optional(),
  activePathsFile: z.string().optional(),
};

export const tokenforgeApplyInputSchema = {
  root: z.string().optional(),
  team: z.string().optional(),
  repo: z.string().optional(),
  provider: z.string().optional(),
  dryRun: z.boolean().optional(),
  mode: z.string().optional(),
  llm: z.string().optional(),
  llmEndpoint: z.string().optional(),
  llmTimeout: z.string().optional(),
  allowExternal: z.boolean().optional(),
  activePathsFile: z.string().optional(),
};

export const TOKENFORGE_SCAN_TOOL = "tokenforge_scan";
export const TOKENFORGE_APPLY_TOOL = "tokenforge_apply";
