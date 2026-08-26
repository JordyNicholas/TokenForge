import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  buildPackId,
  type ProveChangeMarker,
  type ProviderId,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { getAdapter, type PolicyFile } from "../../adapters";
import { mergeTokenForgeSection } from "../../adapters/section-merge";
import { RuntimeError } from "../../app/errors";
import { writeProveChangeMarker } from "../../io/change-marker-file";
import { scanReportPath } from "../../io/paths";
import {
  tryReadScanReport,
  writeScanReport,
} from "../../io/report-file";
import { parseProviderId, scanRepo } from "../scan/scan";

export type ApplyOptions = {
  root: string;
  provider?: string;
  dryRun?: boolean;
  team?: string;
  repo?: string;
  /** Scan enricher flags — used by `init` and by `apply` when no report exists yet. */
  mode?: string;
  llm?: string;
  llmEndpoint?: string;
  llmTimeout?: string;
  externalDataConsent?: boolean;
  /** When set (init), skip a second walk. */
  report?: TokenRiskReport;
};

/**
 * Planned disposition for a pack file.
 * - `create` — path missing
 * - `merge` — instruction markdown: update/append TokenForge section, keep user text
 * - `replace` — full overwrite (TokenForge-owned YAML / owned rule files)
 */
export type PolicyWriteDisposition = "create" | "merge" | "replace";

export type PolicyWritePlan = {
  path: string;
  disposition: PolicyWriteDisposition;
};

export type ApplyResult = {
  report: TokenRiskReport;
  reportPath: string;
  files: PolicyFile[];
  /** Final bytes that would be / were written per path (after merge). */
  resolvedFiles: PolicyFile[];
  writes: PolicyWritePlan[];
  dryRun: boolean;
  /** Prove trail event written on successful apply (#95). */
  changeMarker?: ProveChangeMarker;
};

function safePolicyPath(root: string, relativePath: string): string {
  if (isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new RuntimeError(`Refusing to write ${relativePath}`);
  }
  return join(root, relativePath);
}

async function pathExists(abs: string): Promise<boolean> {
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}

async function tryReadUtf8(abs: string): Promise<string | null> {
  try {
    return await readFile(abs, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot read ${abs}: ${reason}`);
  }
}

async function resolvePolicyWrites(
  root: string,
  files: PolicyFile[],
): Promise<{ resolvedFiles: PolicyFile[]; writes: PolicyWritePlan[] }> {
  const resolvedFiles: PolicyFile[] = [];
  const writes: PolicyWritePlan[] = [];

  for (const file of files) {
    const abs = safePolicyPath(root, file.path);
    const mode = file.writeMode ?? "overwrite";
    const existing = await tryReadUtf8(abs);

    if (mode === "merge-section") {
      const merged = mergeTokenForgeSection(existing, file.contents);
      resolvedFiles.push({
        path: file.path,
        contents: merged.contents,
        writeMode: mode,
      });
      writes.push({ path: file.path, disposition: merged.disposition });
      continue;
    }

    resolvedFiles.push(file);
    writes.push({
      path: file.path,
      disposition: existing == null ? "create" : "replace",
    });
  }

  return { resolvedFiles, writes };
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
    mode: options.mode,
    llm: options.llm,
    llmEndpoint: options.llmEndpoint,
    llmTimeout: options.llmTimeout,
    externalDataConsent: options.externalDataConsent,
  });
  return { ...scanned.report, provider };
}

/**
 * Apply a provider policy pack from a scan report.
 *
 * Instruction markdown uses a managed `<!-- tokenforge:begin/end -->` section
 * inside the provider’s conventional path (`copilot-instructions.md`,
 * `CLAUDE.md`, etc.): create the file when missing, otherwise preserve user
 * text outside the markers. Exclusion YAML / TokenForge-owned sidecars still
 * overwrite. `--dry-run` prints create/merge/replace and does not write.
 */
export async function applyPolicy(options: ApplyOptions): Promise<ApplyResult> {
  const root = resolve(options.root);
  const provider = parseProviderId(options.provider ?? "copilot");
  const adapter = getAdapter(provider);
  const report = await resolveReport(options, root, provider);
  const files = adapter.render(report);
  const reportPath = scanReportPath(root);
  const dryRun = Boolean(options.dryRun);
  const { resolvedFiles, writes } = await resolvePolicyWrites(root, files);

  let changeMarker: ProveChangeMarker | undefined;
  if (!dryRun) {
    await writeScanReport(reportPath, report);
    for (const file of resolvedFiles) {
      await writePolicyFile(root, file);
    }
    const marker: ProveChangeMarker = {
      timestamp: new Date().toISOString(),
      provider,
      packId: buildPackId("apply", provider),
      action: "apply",
      team: report.team,
      repo: report.repo,
    };
    await writeProveChangeMarker(root, marker);
    changeMarker = marker;
  }

  return {
    report,
    reportPath,
    files,
    resolvedFiles,
    writes,
    dryRun,
    changeMarker,
  };
}

/** scan + apply. */
export async function initRepo(options: ApplyOptions): Promise<ApplyResult> {
  const provider = options.provider ?? "copilot";
  const scanned = await scanRepo({
    root: options.root,
    team: options.team,
    repo: options.repo,
    provider,
    mode: options.mode,
    llm: options.llm,
    llmEndpoint: options.llmEndpoint,
    llmTimeout: options.llmTimeout,
    externalDataConsent: options.externalDataConsent,
  });
  return applyPolicy({ ...options, provider, report: scanned.report });
}
