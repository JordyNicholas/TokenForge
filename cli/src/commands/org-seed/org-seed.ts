import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import {
  isTokenRiskReport,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../../app/errors";
import { SCAN_REPORT_FILE } from "../../io/paths";

/** Extension export + CLI scan artifact names under `.tokenforge/`. */
export const LAST_SCAN_FILE = "last-scan.json";

const ROLLUP_BASENAMES = new Set([SCAN_REPORT_FILE, LAST_SCAN_FILE]);

/** Directories skipped during org-seed walk (`.tokenforge` is intentionally kept). */
const ORG_SEED_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".idea",
  "coverage",
]);

export type DashboardSeed = {
  businessUnit: string;
  reports: TokenRiskReport[];
};

export type OrgSeedOptions = {
  /** Root directory to walk for scan JSON files. */
  root: string;
  /** BU label for multi-repo rollup (default: directory name). */
  businessUnit?: string;
  /** Output path (default: `<root>/org-seed.json`). */
  out?: string;
};

export type OrgSeedResult = {
  businessUnit: string;
  reportCount: number;
  sourceFiles: string[];
  outPath: string;
  seed: DashboardSeed;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScanDocument(value: unknown, sourcePath: string): DashboardSeed {
  if (isTokenRiskReport(value)) {
    return { businessUnit: value.team, reports: [value] };
  }
  if (
    isRecord(value) &&
    typeof value.businessUnit === "string" &&
    value.businessUnit.length > 0 &&
    Array.isArray(value.reports) &&
    value.reports.every(isTokenRiskReport)
  ) {
    return {
      businessUnit: value.businessUnit,
      reports: value.reports as TokenRiskReport[],
    };
  }
  throw new UsageError(
    `${sourcePath} is not a Token Risk report or dashboard seed (businessUnit + reports).`,
  );
}

function reportKey(report: TokenRiskReport): string {
  return `${report.team}:${report.repo}`;
}

/** Merge parsed documents; later files win on the same team:repo key. */
export function mergeScanDocuments(
  documents: DashboardSeed[],
  businessUnit: string,
): DashboardSeed {
  if (documents.length === 0) {
    throw new UsageError("No Token Risk reports found under the input directory.");
  }
  const byKey = new Map<string, TokenRiskReport>();
  for (const document of documents) {
    for (const report of document.reports) {
      byKey.set(reportKey(report), report);
    }
  }
  const reports = [...byKey.values()];
  if (reports.length === 0) {
    throw new UsageError("No Token Risk reports found under the input directory.");
  }
  if (documents.length === 1) {
    return {
      businessUnit: documents[0]!.businessUnit,
      reports,
    };
  }
  return { businessUnit, reports };
}

async function walkScanJsonPaths(root: string): Promise<string[]> {
  const found: string[] = [];
  const rootResolved = resolve(root);

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ORG_SEED_SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && ROLLUP_BASENAMES.has(entry.name)) {
        found.push(fullPath);
      }
    }
  }

  await walk(rootResolved);
  return found.sort((a, b) => a.localeCompare(b));
}

/**
 * Roll up `last-scan.json` / `scan-report.json` files under a directory tree
 * into one BU dashboard seed JSON (eng-manager Prove handoff).
 */
export async function rollupOrgSeed(options: OrgSeedOptions): Promise<OrgSeedResult> {
  const root = resolve(options.root);
  let rootStat;
  try {
    rootStat = await stat(root);
  } catch {
    throw new UsageError(`Directory not found: ${root}`);
  }
  if (!rootStat.isDirectory()) {
    throw new UsageError(`org-seed expects a directory path, got ${root}`);
  }

  const scanPaths = await walkScanJsonPaths(root);
  if (scanPaths.length === 0) {
    throw new UsageError(
      `No ${SCAN_REPORT_FILE} or ${LAST_SCAN_FILE} files found under ${root}.`,
    );
  }

  const parsed: DashboardSeed[] = [];
  const sourceFiles: string[] = [];
  for (const scanPath of scanPaths) {
    let raw: string;
    try {
      raw = await readFile(scanPath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RuntimeError(`Could not read ${scanPath}: ${message}`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new UsageError(`${scanPath} is not valid JSON.`);
    }
    parsed.push(parseScanDocument(payload, scanPath));
    sourceFiles.push(relative(root, scanPath).replaceAll("\\", "/"));
  }

  const businessUnit =
    options.businessUnit?.trim() ||
    basename(root) ||
    "Org rollup";
  const seed = mergeScanDocuments(parsed, businessUnit);
  const outPath = resolve(options.out ?? join(root, "org-seed.json"));
  await writeFile(outPath, `${JSON.stringify(seed, null, 2)}\n`, "utf8");

  return {
    businessUnit: seed.businessUnit,
    reportCount: seed.reports.length,
    sourceFiles,
    outPath,
    seed,
  };
}
