import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  buildPackId,
  collapseExclusionPaths,
  type ProveChangeMarker,
  type ProviderId,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { getAdapter, type PolicyFile } from "../../adapters";
import { RuntimeError, UsageError } from "../../app/errors";
import { writeProveChangeMarker } from "../../io/change-marker-file";
import { scanReportPath, tokenforgeDir } from "../../io/paths";
import { tryReadScanReport } from "../../io/report-file";
import {
  getPolicyApplyProvider,
  type ApplyOrgPolicyResult,
  type PolicyApplyProviderId,
} from "../../policy-apply";
import { parseProviderId } from "../scan/scan";

export type OrgApplyOptions = {
  root: string;
  org: string;
  /** PolicyApply provider (default: same as --provider, or copilot). */
  applyProvider?: string;
  /** Fix adapter used to render policy files (default: copilot). */
  provider?: string;
  businessUnit?: string;
  dryRun?: boolean;
  /** Optional pre-loaded report (tests). */
  report?: TokenRiskReport;
};

export type OrgApplyResult = {
  report: TokenRiskReport;
  files: PolicyFile[];
  exclusionPaths: string[];
  apply: ApplyOrgPolicyResult;
  stagedDir: string | null;
  changeMarker?: ProveChangeMarker;
  dryRun: boolean;
};

function exclusionPathsFromReport(report: TokenRiskReport): string[] {
  const paths = report.findings
    .filter((finding) => finding.action === "excluded")
    .map((finding) => finding.path);
  return collapseExclusionPaths(paths);
}

async function stageRemotePayload(
  root: string,
  org: string,
  provider: ProviderId,
  files: PolicyFile[],
  apply: ApplyOrgPolicyResult,
): Promise<string> {
  const stagedDir = join(tokenforgeDir(root), "org-apply");
  await mkdir(stagedDir, { recursive: true });
  const manifest = {
    org,
    provider,
    status: apply.status,
    message: apply.message,
    paths: apply.paths,
    timestamp: new Date().toISOString(),
  };
  await writeFile(
    join(stagedDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  for (const file of files) {
    const safeName = file.path.replace(/[\\/]/g, "__");
    await writeFile(join(stagedDir, safeName), file.contents, "utf8");
  }
  return stagedDir;
}

/**
 * Push (or honestly stage) org content-exclusion / policy via PolicyApplyProvider (#99).
 * Local Fix adapters still render the pack; remote push is provider-specific.
 */
export async function applyOrgRemote(
  options: OrgApplyOptions,
): Promise<OrgApplyResult> {
  const root = resolve(options.root);
  const org = options.org.trim();
  if (!org) {
    throw new UsageError("org-apply requires --org <slug>.");
  }

  const provider = parseProviderId(options.provider ?? "copilot");
  const applyProviderId = (options.applyProvider?.trim() ||
    provider) as PolicyApplyProviderId;
  const dryRun = Boolean(options.dryRun);

  let report = options.report;
  if (!report) {
    const existing = await tryReadScanReport(scanReportPath(root));
    if (!existing) {
      throw new RuntimeError(
        `No scan report at ${scanReportPath(root)}. Run tokenforge scan|init first.`,
      );
    }
    report = { ...existing, provider };
  } else {
    report = { ...report, provider };
  }

  const files = getAdapter(provider).render(report);
  const exclusionPaths = exclusionPathsFromReport(report);
  const applyProvider = getPolicyApplyProvider(applyProviderId);
  const apply = await applyProvider.applyOrgPolicy({
    org,
    businessUnit: options.businessUnit ?? report.team,
    files,
    exclusionPaths,
    dryRun,
  });

  let stagedDir: string | null = null;
  let changeMarker: ProveChangeMarker | undefined;

  if (!dryRun) {
    stagedDir = await stageRemotePayload(root, org, provider, files, apply);
    if (apply.status === "applied" || apply.status === "manual") {
      const marker: ProveChangeMarker = {
        timestamp: new Date().toISOString(),
        provider: String(apply.provider),
        packId: buildPackId(
          "org-apply",
          String(apply.provider),
          options.businessUnit ?? report.team,
        ),
        action: "org-apply",
        team: report.team,
        businessUnit: options.businessUnit ?? report.team,
        repo: report.repo,
      };
      await writeProveChangeMarker(root, marker);
      changeMarker = marker;
    }
  }

  return {
    report,
    files,
    exclusionPaths,
    apply,
    stagedDir,
    changeMarker,
    dryRun,
  };
}
