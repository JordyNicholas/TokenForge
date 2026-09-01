import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  buildPackId,
  type ProveChangeMarker,
  type ProviderId,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { getAdapter, type PolicyFile, type PolicyRenderContext } from "../../adapters";
import { mergeTokenForgeSection } from "../../adapters/section-merge";
import { RuntimeError } from "../../app/errors";
import { readActivePathsFile } from "../../io/active-paths-file";
import { writeProveChangeMarker } from "../../io/change-marker-file";
import { bootstrapRepo } from "../../io/repo-bootstrap";
import { scanReportPath } from "../../io/paths";
import {
  tryReadScanReport,
  writeScanReport,
} from "../../io/report-file";
import { parseProviderId, scanRepo } from "../scan/scan";
import { synthesizeManagedInstructionBody } from "../../policy/apply-synthesis";
import {
  instructionPathForProvider,
  instructionTitleForProvider,
} from "../../policy/provider-instruction-path";

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
  /** Session signal; see `ScanOptions.activePathsFile`. */
  activePathsFile?: string;
  /** Override managed policy byte budget. */
  policyMaxBytes?: number;
  /** Progress sink for hybrid apply LLM synthesis. */
  onProgress?: (message: string) => void;
  /** When set (init), skip a second walk. */
  report?: TokenRiskReport;
  skipApply?: boolean;
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

/**
 * Apply the session signal to a report `apply` did not produce itself.
 *
 * A pre-existing report on disk may predate the flag entirely, so the paths
 * are merged in here rather than trusted to have been recorded at scan time.
 * The findings keep whatever `action` they had — the exclusion guards in
 * `renderExclusionYaml` and `synthesizeLeanInstructions` read `activePaths`
 * directly, so recording it is enough to protect the path.
 */
async function withActivePaths(
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

async function resolveReport(
  options: ApplyOptions,
  root: string,
  provider: ProviderId,
): Promise<TokenRiskReport> {
  if (options.report) {
    return withActivePaths({ ...options.report, provider }, options.activePathsFile);
  }

  const existing = await tryReadScanReport(scanReportPath(root));
  if (existing) {
    return withActivePaths({ ...existing, provider }, options.activePathsFile);
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
  const instructionPath = instructionPathForProvider(provider);
  const synthesis = await synthesizeManagedInstructionBody({
    root,
    report,
    title: instructionTitleForProvider(provider),
    applyOptions: options,
  });
  const renderContext: PolicyRenderContext = {
    managedInstructionBodies: new Map([[instructionPath, synthesis.markdown]]),
    policyMaxBytes: synthesis.policyMaxBytes,
  };
  const files = adapter.render(report, renderContext);
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

/** Bootstrap repo, scan, and optionally apply (#175). */
export async function initRepo(options: ApplyOptions): Promise<ApplyResult> {
  const root = resolve(options.root);
  const provider = options.provider ?? "copilot";
  const dryRun = Boolean(options.dryRun);
  await bootstrapRepo(root, { dryRun });

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

  if (options.skipApply) {
    const reportPath = scanReportPath(root);
    if (!dryRun) {
      await writeScanReport(reportPath, scanned.report);
    }
    return {
      report: scanned.report,
      reportPath,
      files: [],
      resolvedFiles: [],
      writes: [],
      dryRun,
    };
  }

  return applyPolicy({ ...options, root, provider, report: scanned.report });
}
