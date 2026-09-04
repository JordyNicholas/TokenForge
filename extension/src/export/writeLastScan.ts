import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isTokenRiskReport, type ProviderId, type TokenRiskReport } from "@tokenforge/risk-core";
import { workspace } from "vscode";
import type { RiskSession } from "../session/riskSession";
import { createAsyncQueue } from "./asyncQueue";
import { assertValidLastScan, buildLastScanReport } from "./buildLastScan";
import { ensureTokenforgeGitignored } from "./gitignore";
import { hybridFromExistingReport, type WriteLastScanHybrid } from "./hybridPreserve";
import { lastScanFingerprint } from "./lastScanFingerprint";

export { lastScanFingerprint } from "./lastScanFingerprint";
export type { WriteLastScanHybrid } from "./hybridPreserve";

export const LAST_SCAN_DIR = ".tokenforge";
export const LAST_SCAN_FILE = "last-scan.json";

const enqueueLastScanWrite = createAsyncQueue();

export type ExportLastScanResult = {
  reportPath: string;
  savedTokens: number;
  beforeTokens: number;
  afterTokens: number;
  /** False when the on-disk report already matched (timestamp ignored). */
  wrote: boolean;
};

function workspaceRoot(): string {
  const folder = workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("Open a folder workspace to export .tokenforge/last-scan.json");
  }
  return folder.uri.fsPath;
}

export function repoLabel(root: string): string {
  const configured = workspace.getConfiguration("tokenforge").get<string>("repo");
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  const parts = root.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? "workspace";
}

export function teamLabel(): string {
  const team = workspace.getConfiguration("tokenforge").get<string>("team");
  return team && team.trim().length > 0 ? team.trim() : "default";
}

function providerId(): ProviderId {
  const value = workspace.getConfiguration("tokenforge").get<string>("provider");
  if (
    value === "copilot" ||
    value === "cursor" ||
    value === "claude" ||
    value === "gemini" ||
    value === "generic"
  ) {
    return value;
  }
  return "generic";
}

async function readExistingReport(reportPath: string): Promise<TokenRiskReport | undefined> {
  try {
    const raw = await readFile(reportPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return isTokenRiskReport(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function writeLastScanUnlocked(
  session: RiskSession,
  nowMs: number,
  hybrid?: WriteLastScanHybrid,
): Promise<ExportLastScanResult> {
  const root = workspaceRoot();
  const dir = join(root, LAST_SCAN_DIR);
  await mkdir(dir, { recursive: true });
  const reportPath = join(dir, LAST_SCAN_FILE);

  // Re-read immediately before write so a queued auto-export still sees hybrid
  // layers that Analyze rules just finished writing.
  const existing = await readExistingReport(reportPath);
  const effectiveHybrid = hybrid ?? (existing ? hybridFromExistingReport(existing) : undefined);

  const report = assertValidLastScan(
    buildLastScanReport({
      tabs: session.listAll(nowMs),
      decisionFor: (uri) => session.decision(uri),
      repo: repoLabel(root),
      team: teamLabel(),
      provider: providerId(),
      timestamp: new Date(nowMs).toISOString(),
      llmFindings: effectiveHybrid?.llmFindings,
      llmMeta: effectiveHybrid?.llmMeta,
      llmCandidateTokens: effectiveHybrid?.llmCandidateTokens,
    }),
  );

  await ensureTokenforgeGitignored(root);

  const nextFingerprint = lastScanFingerprint(report);
  const previousFingerprint = existing ? lastScanFingerprint(existing) : undefined;

  if (previousFingerprint === nextFingerprint && !hybrid) {
    return {
      reportPath,
      savedTokens: report.totals.savedTokens,
      beforeTokens: report.totals.beforeTokens,
      afterTokens: report.totals.afterTokens,
      wrote: false,
    };
  }

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    reportPath,
    savedTokens: report.totals.savedTokens,
    beforeTokens: report.totals.beforeTokens,
    afterTokens: report.totals.afterTokens,
    wrote: true,
  };
}

export async function writeLastScan(
  session: RiskSession,
  nowMs: number = Date.now(),
  hybrid?: WriteLastScanHybrid,
): Promise<ExportLastScanResult> {
  return enqueueLastScanWrite(() => writeLastScanUnlocked(session, nowMs, hybrid));
}

export function resolveWorkspaceRoot(): string {
  return workspaceRoot();
}
