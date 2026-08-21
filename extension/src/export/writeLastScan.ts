import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProviderId, ScanLlmMetadata, TokenRiskFinding, TokenRiskReport } from "@tokenforge/risk-core";
import { workspace } from "vscode";
import type { RiskSession } from "../session/riskSession";
import { assertValidLastScan, buildLastScanReport } from "./buildLastScan";
import { ensureTokenforgeGitignored } from "./gitignore";
import { lastScanFingerprint } from "./lastScanFingerprint";

export { lastScanFingerprint } from "./lastScanFingerprint";

export const LAST_SCAN_DIR = ".tokenforge";
export const LAST_SCAN_FILE = "last-scan.json";

export type ExportLastScanResult = {
  reportPath: string;
  savedTokens: number;
  beforeTokens: number;
  afterTokens: number;
  /** False when the on-disk report already matched (timestamp ignored). */
  wrote: boolean;
};

export type WriteLastScanHybrid = {
  llmFindings: readonly TokenRiskFinding[];
  llmMeta: ScanLlmMetadata;
  llmCandidateTokens: number;
};

function workspaceRoot(): string {
  const folder = workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("Open a folder workspace to export .tokenforge/last-scan.json");
  }
  return folder.uri.fsPath;
}

function repoLabel(root: string): string {
  const configured = workspace.getConfiguration("tokenforge").get<string>("repo");
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  const parts = root.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? "workspace";
}

function teamLabel(): string {
  const team = workspace.getConfiguration("tokenforge").get<string>("team");
  return team && team.trim().length > 0 ? team.trim() : "default";
}

function providerId(): ProviderId {
  const value = workspace.getConfiguration("tokenforge").get<string>("provider");
  if (
    value === "copilot" ||
    value === "cursor" ||
    value === "claude" ||
    value === "generic"
  ) {
    return value;
  }
  return "generic";
}

async function readExistingFingerprint(reportPath: string): Promise<string | undefined> {
  try {
    const raw = await readFile(reportPath, "utf8");
    const parsed = JSON.parse(raw) as TokenRiskReport;
    return lastScanFingerprint(parsed);
  } catch {
    return undefined;
  }
}

export async function writeLastScan(
  session: RiskSession,
  nowMs: number = Date.now(),
  hybrid?: WriteLastScanHybrid,
): Promise<ExportLastScanResult> {
  const root = workspaceRoot();
  const report = assertValidLastScan(
    buildLastScanReport({
      tabs: session.listAll(nowMs),
      decisionFor: (uri) => session.decision(uri),
      repo: repoLabel(root),
      team: teamLabel(),
      provider: providerId(),
      timestamp: new Date(nowMs).toISOString(),
      llmFindings: hybrid?.llmFindings,
      llmMeta: hybrid?.llmMeta,
      llmCandidateTokens: hybrid?.llmCandidateTokens,
    }),
  );

  await ensureTokenforgeGitignored(root);

  const dir = join(root, LAST_SCAN_DIR);
  await mkdir(dir, { recursive: true });
  const reportPath = join(dir, LAST_SCAN_FILE);
  const nextFingerprint = lastScanFingerprint(report);
  const previousFingerprint = await readExistingFingerprint(reportPath);

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

export function resolveWorkspaceRoot(): string {
  return workspaceRoot();
}
