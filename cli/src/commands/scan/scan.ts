import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  isTokenRiskReport,
  mergeFindings,
  primaryReason,
  scoreRisk,
  selectEnrichmentCandidates,
  type LlmBackendId,
  type ProviderId,
  type RiskAssessment,
  type ScanMetadata,
  type ScanMode,
  type TokenRiskFinding,
  type TokenRiskReport,
  type TokenRiskTotals,
} from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../../app/errors";
import {
  MAX_CANDIDATE_BYTES,
  getEnricher,
  parseLlmSpec,
  type EnrichmentCandidate,
} from "../../enrichers";
import { SKIP_DIR_NAMES, defaultRepoLabel, scanReportPath } from "../../io/paths";

const PROVIDERS = new Set<ProviderId>([
  "copilot",
  "cursor",
  "claude",
  "generic",
]);

const SCAN_MODES = new Set<ScanMode>(["heuristic", "hybrid"]);

export type ScanOptions = {
  root: string;
  team?: string;
  repo?: string;
  provider?: string;
  mode?: string;
  llm?: string;
  llmEndpoint?: string;
  now?: Date;
};

export type ScanResult = {
  report: TokenRiskReport;
  reportPath: string;
  /** Every file scored, including the keep-set that is not in `findings`. */
  assessments: RiskAssessment[];
};

export function parseProviderId(value: string): ProviderId {
  if (PROVIDERS.has(value as ProviderId)) {
    return value as ProviderId;
  }
  throw new UsageError(
    `Unknown provider "${value}". Use copilot, cursor, claude, or generic.`,
  );
}

export function parseScanMode(value: string | undefined): ScanMode {
  const mode = value ?? "heuristic";
  if (!SCAN_MODES.has(mode as ScanMode)) {
    throw new UsageError('Unknown scan mode. Use "heuristic" or "hybrid".');
  }
  return mode as ScanMode;
}

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

async function walkFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new RuntimeError(`Cannot read directory ${dir}: ${reason}`);
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIR_NAMES.has(entry.name)) {
          await walk(abs);
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(abs);
      }
    }
  }

  await walk(root);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function tallyTotals(assessments: readonly RiskAssessment[]): TokenRiskTotals {
  let beforeTokens = 0;
  let afterTokens = 0;
  for (const assessment of assessments) {
    beforeTokens += assessment.estTokens;
    if (!assessment.atRisk) {
      afterTokens += assessment.estTokens;
    }
  }
  return {
    beforeTokens,
    afterTokens,
    savedTokens: beforeTokens - afterTokens,
  };
}

function toFinding(assessment: RiskAssessment): TokenRiskFinding | undefined {
  const reason = primaryReason(assessment.reasons);
  if (!assessment.atRisk || reason === undefined) {
    return undefined;
  }
  return {
    path: assessment.path,
    reason,
    bytes: assessment.bytes,
    estTokens: assessment.estTokens,
    action: "excluded",
    source: "heuristic",
  };
}

async function loadCandidateExcerpt(
  root: string,
  assessment: RiskAssessment,
): Promise<EnrichmentCandidate> {
  const abs = join(root, assessment.path);
  let excerpt = "";
  try {
    const raw = await readFile(abs);
    excerpt = raw.subarray(0, MAX_CANDIDATE_BYTES).toString("utf8");
  } catch {
    excerpt = "";
  }
  return {
    path: assessment.path,
    bytes: assessment.bytes,
    estTokens: assessment.estTokens,
    excerpt,
  };
}

async function buildHybridFindings(
  root: string,
  assessments: RiskAssessment[],
  heuristicFindings: TokenRiskFinding[],
  options: ScanOptions,
): Promise<{ findings: TokenRiskFinding[]; scan?: ScanMetadata }> {
  const spec = parseLlmSpec(options.llm);
  const enricher = getEnricher(spec.backend as LlmBackendId);
  const candidateAssessments = selectEnrichmentCandidates(assessments);
  const candidates = await Promise.all(
    candidateAssessments.map((assessment) => loadCandidateExcerpt(root, assessment)),
  );

  const started = Date.now();
  const enrichment = await enricher.enrich({
    root,
    candidates,
    model: spec.model,
    endpoint: options.llmEndpoint,
  });

  return {
    findings: mergeFindings(heuristicFindings, enrichment.findings),
    scan: {
      mode: "hybrid",
      llm: {
        ...enrichment.meta,
        durationMs: enrichment.meta.durationMs || Date.now() - started,
      },
    },
  };
}

/**
 * Walk `root`, score every file with risk-core, and build a Token Risk report.
 * Findings are at-risk paths only (proposed `excluded`). Totals include the
 * keep-set so `beforeTokens` is the full tree.
 */
export async function scanRepo(options: ScanOptions): Promise<ScanResult> {
  const root = resolve(options.root);
  const mode = parseScanMode(options.mode);

  let rootStat;
  try {
    rootStat = await stat(root);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot scan ${root}: ${reason}`);
  }
  if (!rootStat.isDirectory()) {
    throw new RuntimeError(`Scan root is not a directory: ${root}`);
  }

  const files = await walkFiles(root);
  const assessments: RiskAssessment[] = [];

  for (const abs of files) {
    const bytes = (await stat(abs)).size;
    const path = toPosix(relative(root, abs));
    assessments.push(scoreRisk({ path, bytes, inactiveMs: 0 }));
  }

  assessments.sort((a, b) => b.estTokens - a.estTokens || a.path.localeCompare(b.path));

  const heuristicFindings = assessments.flatMap((assessment) => {
    const finding = toFinding(assessment);
    return finding ? [finding] : [];
  });

  let findings = heuristicFindings;
  let scan: ScanMetadata | undefined;

  if (mode === "hybrid") {
    const hybrid = await buildHybridFindings(root, assessments, heuristicFindings, options);
    findings = hybrid.findings;
    scan = hybrid.scan;
  }

  const report: TokenRiskReport = {
    source: "cli",
    timestamp: (options.now ?? new Date()).toISOString(),
    repo: options.repo?.trim() || defaultRepoLabel(root),
    team: options.team?.trim() || "local",
    provider: parseProviderId(options.provider ?? "generic"),
    findings,
    totals: tallyTotals(assessments),
    ...(scan ? { scan } : {}),
  };

  if (!isTokenRiskReport(report)) {
    throw new RuntimeError("Scan produced a report that failed the v0 contract.");
  }

  return { report, reportPath: scanReportPath(root), assessments };
}
