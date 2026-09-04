import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { applyPolicy, initRepo } from "../commands/apply/apply";
import { runDiscover } from "../commands/discover/discover";
import { applyOrgPack } from "../commands/org-pack/org-pack";
import { runPilotPack } from "../commands/pilot/pilot";
import { checkPolicyDrift } from "../commands/drift/drift";
import { rollupOrgSeed } from "../commands/org-seed/org-seed";
import { promoteShieldCandidates } from "../commands/promote-shield/promote-shield";
import { writeProveReport } from "../commands/prove-report/prove-report";
import { applyOrgRemote } from "../commands/org-apply/org-apply";
import { runMcpServer } from "../mcp/runMcpServer";
import {
  applySectionHashPath,
  discoverLatestPath,
  proveChangeLatestPath,
  proveHandoffPath,
} from "../io/paths";
import { formatEnforcementBadge } from "../output/enforcement";
import { formatWriteSummary } from "../output/write-summary";
import { pullUsage } from "../commands/usage-pull/usage-pull";
import { syncUsage } from "../commands/usage-sync/usage-sync";
import { scanRepo, type ScanResult } from "../commands/scan/scan";
import { writeScanReport } from "../io/report-file";
import { formatDiscoverTable } from "../output/discover-table";
import { formatScanTable } from "../output/table";
import { savingsExitCode, totalsPayload } from "../savings/savings";
import { UsageError, isCliError } from "./errors";
import { USAGE_HINT, printHelp } from "./help";

export type CliIo = {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
};

function printReport(
  io: CliIo,
  report: TokenRiskReport,
  scan: ScanResult,
  json: boolean,
): void {
  if (json) {
    io.stdout.write(`${JSON.stringify(totalsPayload(report.totals), null, 2)}\n`);
    return;
  }
  io.stdout.write(formatScanTable(scan));
}

function printApply(
  io: CliIo,
  scan: ScanResult,
  writes: { path: string; disposition: string }[],
  dryRun: boolean,
  reportPath: string,
  json: boolean,
  options: {
    changeMarkerPath?: string;
    sectionHashPath?: string;
    promoteMessage?: string;
    discoverHint?: string;
  } = {},
): void {
  printReport(io, scan.report, scan, json);
  const sink = json ? io.stderr : io.stdout;
  sink.write(`${formatEnforcementBadge(scan.report.provider)}\n`);
  sink.write(`${formatWriteSummary(writes)}\n`);
  if (dryRun) {
    sink.write(
      "dry-run; instruction files use a managed TokenForge section (user text outside markers kept):\n",
    );
  } else {
    sink.write("wrote:\n");
    sink.write(`  ${reportPath}\n`);
    if (options.sectionHashPath) {
      sink.write(`  ${options.sectionHashPath}\n`);
    }
  }
  for (const write of writes) {
    sink.write(`  ${write.disposition.padEnd(7)} ${write.path}\n`);
  }
  if (options.changeMarkerPath) {
    sink.write(`  ${options.changeMarkerPath}\n`);
  }
  if (options.promoteMessage) {
    sink.write(`${options.promoteMessage}\n`);
  }
  if (options.discoverHint) {
    sink.write(`${options.discoverHint}\n`);
  }
}

/**
 * Parse argv and run a command. Returns a process exit code.
 */
export async function runCli(
  argv: string[],
  io: CliIo = process,
): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        help: { type: "boolean", short: "h", default: false },
        team: { type: "string" },
        repo: { type: "string" },
        provider: { type: "string" },
        "apply-provider": { type: "string" },
        "usage-provider": { type: "string" },
        period: { type: "string" },
        org: { type: "string" },
        file: { type: "string" },
        out: { type: "string" },
        mode: { type: "string" },
        llm: { type: "string" },
        "llm-endpoint": { type: "string" },
        "llm-timeout": { type: "string" },
        "allow-external": { type: "boolean", default: false },
        "active-paths-file": { type: "string" },
        "policy-max-bytes": { type: "string" },
        report: { type: "string" },
        rescan: { type: "boolean", default: false },
        "skip-apply": { type: "boolean", default: false },
        prove: { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
        "promote-shield": { type: "boolean", default: false },
        json: { type: "boolean", default: false },
      },
    });

    const [command, rootArg] = positionals;

    if (values.help || command === "help" || !command) {
      const topic =
        command === "help" ? rootArg : values.help && command ? command : undefined;
      printHelp(io, topic);
      return 0;
    }

    const root = resolve(rootArg ?? process.cwd());
    const policyMaxBytesRaw = values["policy-max-bytes"];
    const policyMaxBytes =
      policyMaxBytesRaw !== undefined
        ? Number.parseInt(String(policyMaxBytesRaw), 10)
        : undefined;
    const common = {
      root,
      team: values.team,
      repo: values.repo,
      provider: values.provider,
      mode: values.mode,
      llm: values.llm,
      llmEndpoint: values["llm-endpoint"],
      llmTimeout: values["llm-timeout"],
      externalDataConsent: values["allow-external"],
      activePathsFile: values["active-paths-file"],
      policyMaxBytes:
        policyMaxBytes !== undefined && Number.isFinite(policyMaxBytes)
          ? policyMaxBytes
          : undefined,
    };

    if (command === "scan") {
      const result = await scanRepo({
        ...common,
        onProgress: (message) => {
          io.stderr.write(`tokenforge: ${message}\n`);
        },
      });
      await writeScanReport(result.reportPath, result.report);
      printReport(io, result.report, result, Boolean(values.json));
      if (!values.json) {
        io.stdout.write(`wrote ${result.reportPath}\n`);
      } else {
        io.stderr.write(`wrote ${result.reportPath}\n`);
      }
      return savingsExitCode(result.report.totals);
    }

    if (command === "discover") {
      const discovered = await runDiscover({
        ...common,
        provider: values.provider ?? "copilot",
        reportPath: values.report,
        rescan: values.rescan,
        writeReport: true,
      });
      if (values.json) {
        io.stdout.write(
          `${JSON.stringify(
            {
              missedTokens: discovered.missedTokens,
              opportunities: discovered.opportunities,
              exclusionPath: discovered.exclusionPath,
              appliedPatterns: discovered.appliedPatterns,
              hasApplyMarker: discovered.hasApplyMarker,
              reportPath: discovered.reportPath,
              discoverReportPath: discovered.discoverReportPath,
            },
            null,
            2,
          )}\n`,
        );
      } else {
        io.stdout.write(formatDiscoverTable(discovered));
        if (discovered.discoverReportPath) {
          io.stderr.write(`wrote ${discovered.discoverReportPath}\n`);
        }
      }
      return discovered.missedTokens > 0 ? 0 : 3;
    }

    if (command === "apply" || command === "init") {
      const applied =
        command === "init"
          ? await initRepo({
              ...common,
              dryRun: values["dry-run"],
              skipApply: values["skip-apply"],
            })
          : await applyPolicy({
              ...common,
              dryRun: values["dry-run"],
              onProgress: (message) => {
                io.stderr.write(`tokenforge: ${message}\n`);
              },
            });

      let promoteMessage: string | undefined;
      if (values["promote-shield"]) {
        const promoted = await promoteShieldCandidates({
          root,
          provider: common.provider ?? "cursor",
          dryRun: applied.dryRun,
        });
        promoteMessage = promoted.message;
      }

      const discoverHint =
        !applied.dryRun && !values["skip-apply"]
          ? `next: tokenforge discover . → ${discoverLatestPath(root)}`
          : undefined;

      printApply(
        io,
        { report: applied.report, reportPath: applied.reportPath, assessments: [] },
        applied.writes,
        applied.dryRun,
        applied.reportPath,
        Boolean(values.json),
        {
          changeMarkerPath: applied.changeMarker
            ? proveChangeLatestPath(root)
            : undefined,
          sectionHashPath: applied.changeMarker ? applySectionHashPath(root) : undefined,
          promoteMessage,
          discoverHint,
        },
      );
      return savingsExitCode(applied.report.totals);
    }

    if (command === "promote-shield") {
      const promoted = await promoteShieldCandidates({
        root,
        provider: values.provider ?? "cursor",
        dryRun: values["dry-run"],
      });
      if (values.json) {
        io.stdout.write(`${JSON.stringify(promoted, null, 2)}\n`);
      } else {
        io.stdout.write(`${promoted.message}\n`);
        for (const pattern of promoted.patterns) {
          io.stdout.write(`  ${pattern}\n`);
        }
      }
      return 0;
    }

    if (command === "pilot") {
      const pilot = await runPilotPack({
        ...common,
        provider: values.provider ?? "copilot",
        dryRun: values["dry-run"],
        skipApply: values["skip-apply"],
        prove: values.prove,
      });
      if (values.json) {
        io.stdout.write(
          `${JSON.stringify(
            {
              steps: pilot.steps,
              totals: pilot.report.totals,
              reportPath: pilot.reportPath,
              dryRun: pilot.dryRun,
              changeMarker: pilot.changeMarker,
              files: pilot.apply?.files.map((file) => file.path) ?? [],
              handoff: pilot.handoff,
              staged: pilot.staged,
            },
            null,
            2,
          )}\n`,
        );
      } else {
        const sink = io.stdout;
        sink.write(`pilot ${pilot.report.team} · ${pilot.report.provider}\n`);
        for (const step of pilot.steps) {
          sink.write(`  ${step}\n`);
        }
        if (pilot.changeMarker) {
          sink.write(`wrote ${proveChangeLatestPath(root)}\n`);
        }
        if (pilot.handoff) {
          sink.write(`wrote ${proveHandoffPath(root)}\n`);
          sink.write(`open ${pilot.handoff.dashboardUrlHint}\n`);
        }
        if (!pilot.dryRun && !values["skip-apply"]) {
          sink.write(`next: tokenforge discover . → ${discoverLatestPath(root)}\n`);
        }
      }
      return savingsExitCode(pilot.report.totals);
    }

    if (command === "prove-report") {
      const written = await writeProveReport({
        root,
        outPath: values.out,
      });
      if (values.json) {
        io.stdout.write(
          `${JSON.stringify(
            { outPath: written.outPath, reportPath: written.reportPath },
            null,
            2,
          )}\n`,
        );
      } else {
        io.stdout.write(`wrote ${written.outPath}\n`);
      }
      return 0;
    }

    if (command === "drift") {
      const drift = await checkPolicyDrift({
        root,
        provider: values.provider,
      });
      if (values.json) {
        io.stdout.write(`${JSON.stringify(drift, null, 2)}\n`);
      } else {
        io.stdout.write(`${drift.message}\n`);
      }
      return drift.status === "ok" ? 0 : 2;
    }

    if (command === "usage-pull") {
      const usageProvider = values["usage-provider"] ?? "copilot";
      const result = await pullUsage({
        provider: usageProvider,
        org: values.org,
        period: values.period ?? "",
        teamScope: values.team,
        fixtureFile: values.file,
        outPath: values.out,
        root: rootArg ? root : undefined,
      });
      if (values.json) {
        io.stdout.write(`${JSON.stringify(result.metrics, null, 2)}\n`);
      } else {
        io.stdout.write(
          `usage-pull ${result.provider} · ${result.metrics.period} · ` +
            `${result.metrics.totals.creditsUsed} credits · ` +
            `$${result.metrics.totals.estimatedUsd}\n`,
        );
        if (result.outPath) {
          io.stdout.write(`wrote ${result.outPath}\n`);
        }
        if (result.latestPath && result.latestPath !== result.outPath) {
          io.stdout.write(`wrote ${result.latestPath}\n`);
        }
      }
      return 0;
    }

    if (command === "usage-sync") {
      const usageProvider = values["usage-provider"];
      const syncRoot = resolve(rootArg ?? process.cwd());
      const result = await syncUsage({
        root: syncRoot,
        provider: usageProvider,
        org: values.org,
        period: values.period,
        teamScope: values.team,
        fixtureFile: values.file,
        outPath: values.out,
      });
      if (values.json) {
        io.stdout.write(`${JSON.stringify(result.metrics, null, 2)}\n`);
      } else {
        io.stdout.write(
          `usage-sync ${result.provider} · ${result.period} · ` +
            `${result.metrics.totals.creditsUsed} credits · ` +
            `$${result.metrics.totals.estimatedUsd}\n`,
        );
        if (result.periodPath) {
          io.stdout.write(`wrote ${result.periodPath}\n`);
        }
        if (result.latestPath) {
          io.stdout.write(`wrote ${result.latestPath}\n`);
        }
      }
      return 0;
    }

    if (command === "org-seed") {
      const rollup = await rollupOrgSeed({
        root,
        businessUnit: values.team,
        out: values.out,
      });
      if (values.json) {
        io.stdout.write(
          `${JSON.stringify(
            {
              businessUnit: rollup.businessUnit,
              reportCount: rollup.reportCount,
              sourceFiles: rollup.sourceFiles,
              outPath: rollup.outPath,
              seed: rollup.seed,
            },
            null,
            2,
          )}\n`,
        );
      } else {
        io.stdout.write(
          `org-seed ${rollup.businessUnit} · ${rollup.reportCount} report(s) from ${rollup.sourceFiles.length} file(s)\n`,
        );
        io.stdout.write(`wrote ${rollup.outPath}\n`);
        for (const source of rollup.sourceFiles) {
          io.stdout.write(`  ${source}\n`);
        }
      }
      return 0;
    }

    if (command === "org-pack") {
      if (!rootArg) {
        throw new UsageError("org-pack requires a seed JSON path.\n" + USAGE_HINT);
      }
      const pack = await applyOrgPack({
        seedPath: rootArg,
        outRoot: values.out,
        provider: values.provider,
        dryRun: values["dry-run"],
      });
      if (values.json) {
        io.stdout.write(
          `${JSON.stringify(
            {
              businessUnit: pack.businessUnit,
              provider: pack.provider,
              totals: pack.report.totals,
              files: pack.files.map((file) => file.path),
              dryRun: pack.dryRun,
              changeMarker: pack.changeMarker,
            },
            null,
            2,
          )}\n`,
        );
      } else {
        const sink = io.stdout;
        const packRoot = resolve(values.out ?? process.cwd());
        sink.write(
          `org-pack ${pack.businessUnit} · ${pack.provider}` +
            `${pack.dryRun ? " (dry-run)" : ""}\n`,
        );
        sink.write(
          pack.dryRun ? "would write:\n" : `wrote under ${pack.outDir}:\n`,
        );
        for (const file of pack.files) {
          sink.write(`  ${file.path}\n`);
        }
        if (pack.changeMarker) {
          sink.write(`  ${proveChangeLatestPath(packRoot)}\n`);
        }
      }
      return savingsExitCode(pack.report.totals);
    }

    if (command === "org-apply") {
      if (!values.org?.trim()) {
        throw new UsageError("org-apply requires --org <slug>.\n" + USAGE_HINT);
      }
      const remote = await applyOrgRemote({
        root,
        org: values.org,
        provider: values.provider,
        applyProvider: values["apply-provider"],
        businessUnit: values.team,
        dryRun: values["dry-run"],
      });
      if (values.json) {
        io.stdout.write(
          `${JSON.stringify(
            {
              org: remote.apply.org,
              provider: remote.apply.provider,
              status: remote.apply.status,
              message: remote.apply.message,
              paths: remote.apply.paths,
              stagedDir: remote.stagedDir,
              changeMarker: remote.changeMarker,
              dryRun: remote.dryRun,
              totals: remote.report.totals,
            },
            null,
            2,
          )}\n`,
        );
      } else {
        const sink = io.stdout;
        sink.write(
          `org-apply ${remote.apply.org} · ${remote.apply.provider} · ${remote.apply.status}` +
            `${remote.dryRun ? " (dry-run)" : ""}\n`,
        );
        sink.write(`${remote.apply.message}\n`);
        if (remote.stagedDir) {
          sink.write(`staged ${remote.stagedDir}\n`);
        }
        if (remote.changeMarker) {
          sink.write(`wrote ${proveChangeLatestPath(root)}\n`);
        }
      }
      return savingsExitCode(remote.report.totals);
    }

    if (command === "mcp") {
      await runMcpServer();
      return 0;
    }

    throw new UsageError(`Unknown command "${command}".\n` + USAGE_HINT);
  } catch (error) {
    if (isCliError(error)) {
      io.stderr.write(`${error.message}\n`);
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n`);
    return 1;
  }
}
