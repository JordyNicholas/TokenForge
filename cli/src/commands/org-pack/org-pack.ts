import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  isTokenRiskReport,
  type ProviderId,
  type TokenRiskFinding,
  type TokenRiskReport,
  type TokenRiskTotals,
} from "@tokenforge/risk-core";
import { getAdapter, type PolicyFile } from "../../adapters";
import { RuntimeError, UsageError } from "../../app/errors";
import { parseProviderId } from "../scan/scan";

export type OrgPackOptions = {
  /** Path to a dashboard seed (businessUnit + reports) or a single report. */
  seedPath: string;
  /** Directory that receives `.tokenforge/org-policy/` (default: cwd). */
  outRoot?: string;
  provider?: string;
  dryRun?: boolean;
};

export type OrgPackResult = {
  businessUnit: string;
  provider: ProviderId;
  report: TokenRiskReport;
  files: PolicyFile[];
  outDir: string;
  dryRun: boolean;
};

type SeedLike = {
  businessUnit: string;
  reports: TokenRiskReport[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSeed(value: unknown): SeedLike {
  if (isTokenRiskReport(value)) {
    return { businessUnit: value.team, reports: [value] };
  }
  if (
    isRecord(value) &&
    typeof value.businessUnit === "string" &&
    Array.isArray(value.reports) &&
    value.reports.every(isTokenRiskReport)
  ) {
    return {
      businessUnit: value.businessUnit,
      reports: value.reports as TokenRiskReport[],
    };
  }
  throw new UsageError(
    "org-pack expects a dashboard seed (businessUnit + reports) or a Token Risk report JSON.",
  );
}

function aggregateReports(
  businessUnit: string,
  reports: TokenRiskReport[],
  provider: ProviderId,
): TokenRiskReport {
  const findings: TokenRiskFinding[] = [];
  const totals: TokenRiskTotals = {
    beforeTokens: 0,
    afterTokens: 0,
    savedTokens: 0,
  };
  const seen = new Set<string>();
  for (const report of reports) {
    totals.beforeTokens += report.totals.beforeTokens;
    totals.afterTokens += report.totals.afterTokens;
    totals.savedTokens += report.totals.savedTokens;
    for (const finding of report.findings) {
      const key = `${report.repo}::${finding.path}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      findings.push({
        ...finding,
        path: `${report.repo}/${finding.path}`.replace(/\/+/g, "/"),
      });
    }
  }
  return {
    source: "cli",
    timestamp: new Date().toISOString(),
    repo: `org:${businessUnit}`,
    team: businessUnit,
    provider,
    findings,
    totals,
  };
}

function safePolicyPath(root: string, relativePath: string): string {
  if (isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new RuntimeError(`Refusing to write ${relativePath}`);
  }
  return join(root, relativePath);
}

/**
 * Aggregate multi-team seed findings into one org policy pack (#28 thin).
 * Writes under `.tokenforge/org-policy/` — local files only, no org API push.
 */
export async function applyOrgPack(options: OrgPackOptions): Promise<OrgPackResult> {
  const seedPath = resolve(options.seedPath);
  const outRoot = resolve(options.outRoot ?? process.cwd());
  const provider = parseProviderId(options.provider ?? "generic");
  const dryRun = Boolean(options.dryRun);

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(seedPath, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot read seed ${seedPath}: ${reason}`);
  }

  const seed = parseSeed(raw);
  const report = aggregateReports(seed.businessUnit, seed.reports, provider);
  const adapter = getAdapter(provider);
  const rendered = adapter.render(report);
  const outDirRel = ".tokenforge/org-policy";
  const files: PolicyFile[] = rendered.map((file) => ({
    path: join(outDirRel, file.path.replace(/^\.\//, "")),
    contents: [
      `# Org policy pack for ${seed.businessUnit}`,
      `# Aggregated from ${seed.reports.length} team report(s).`,
      `# TokenForge does not push to vendor org APIs — review and apply manually.`,
      "",
      file.contents,
    ].join("\n"),
  }));

  if (!dryRun) {
    for (const file of files) {
      const abs = safePolicyPath(outRoot, file.path);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, file.contents, "utf8");
    }
  }

  return {
    businessUnit: seed.businessUnit,
    provider,
    report,
    files,
    outDir: join(outRoot, outDirRel),
    dryRun,
  };
}
