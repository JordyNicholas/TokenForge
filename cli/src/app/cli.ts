import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { applyPolicy, initRepo } from "../commands/apply/apply";
import { applyOrgPack } from "../commands/org-pack/org-pack";
import { runPilotPack } from "../commands/pilot/pilot";
import { applyOrgRemote } from "../commands/org-apply/org-apply";
import { proveChangeLatestPath } from "../io/paths";
import { pullUsage } from "../commands/usage-pull/usage-pull";
import { syncUsage } from "../commands/usage-sync/usage-sync";
import { scanRepo, type ScanResult } from "../commands/scan/scan";
import { writeScanReport } from "../io/report-file";
import { formatScanTable } from "../output/table";
import { savingsExitCode, totalsPayload } from "../savings/savings";
import { UsageError, isCliError } from "./errors";

const USAGE = `Usage: tokenforge <command> [root] [options]

Commands:
  scan [root]         Score high-risk paths and write .tokenforge/scan-report.json
  apply [root]        Write lean instructions + exclusion candidates (provider adapter)
  init [root]         scan + apply
  pilot [root]        Org pilot pack: scan → apply → Prove-ready (#100)
  org-pack <seed.json>
                      Aggregate a multi-team seed into .tokenforge/org-policy/ (#28)
  org-apply [root]    Stage / push org content exclusions via PolicyApplyProvider (#99)
  usage-pull          Fetch billed usage into UsageMetrics JSON (Wave B / #90)
  usage-sync [root]   Pull usage via UsageProvider into .tokenforge/ (Wave B / #94)

Options:
  --team <name>         Team label (default: local)
  --repo <name>         Repo label (default: directory name)
  --provider <id>       copilot | cursor | claude | generic
                        scan default: generic; apply/init/pilot/org-apply default: copilot
  --apply-provider <id> fixture | copilot | cursor | claude (org-apply; default: --provider)
  --usage-provider <id>
                        fixture | copilot | cursor | claude (usage-pull/sync; default: copilot)
  --period <YYYY-MM>    Billing period for usage-pull / usage-sync
  --org <slug>          GitHub org (Copilot) or Cursor organizationId (required for org-apply)
  --file <path>         UsageMetrics fixture file (usage-pull with fixture)
  --out <path>          Write UsageMetrics JSON (usage-pull; also copied when --root set)
  --out <dir>           Output root for org-pack (default: cwd)
  --mode <mode>         heuristic | hybrid (default: heuristic; scan and init)
  --llm <spec>          LLM enricher backend[:model] (hybrid only; scan and init)
                        noop (default) | ollama:<model> | anthropic:<model> |
                        codex | claude-code. The two CLI backends take no model:
                        they use whatever that CLI is signed in and configured
                        with. e.g. ollama:qwen2.5-coder:7b, claude-code
  --llm-endpoint <url>  Override Ollama/Anthropic API base URL
                        (rejected by codex and claude-code: the CLI owns it)
  --llm-timeout <sec>   Per-batch timeout in seconds
                        (Ollama: 900; Codex: 120; Claude Code: 180)
  --allow-external      Confirm that bounded source excerpts may leave this
                        machine (required by anthropic, codex, claude-code)
  --active-paths-file <p>  Report (e.g. .tokenforge/last-scan.json) or JSON array of
                        open paths. Those files are reported but never proposed
                        for exclusion. Not auto-detected: a stale export would
                        silently protect paths nobody has open any more.
  --skip-apply          Pilot: scan only (still writes report)
  --dry-run             Print planned create/merge/replace; do not write
  --json                Print machine JSON totals (savedPercent included) to stdout
  -h, --help            Show this help

Apply safety (#130):
  Instruction markdown (e.g. .github/copilot-instructions.md, CLAUDE.md) gets a
  managed <!-- tokenforge:begin --> … <!-- tokenforge:end --> section: create the
  file when missing, otherwise keep user text outside the markers. Exclusion YAML
  / TokenForge-owned rule files may still fully replace.

Exit codes:
  0   success, savedTokens > 0
  1   runtime error
  2   usage error
  3   success, but savedTokens is 0
`;

export type CliIo = {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
};

function printHelp(io: CliIo): void {
  io.stdout.write(`${USAGE}\n`);
}

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
  changeMarkerPath?: string,
): void {
  printReport(io, scan.report, scan, json);
  const sink = json ? io.stderr : io.stdout;
  if (dryRun) {
    sink.write(
      "dry-run; instruction files use a managed TokenForge section (user text outside markers kept):\n",
    );
  } else {
    sink.write("wrote:\n");
    sink.write(`  ${reportPath}\n`);
  }
  for (const write of writes) {
    sink.write(`  ${write.disposition.padEnd(7)} ${write.path}\n`);
  }
  if (changeMarkerPath) {
    sink.write(`  ${changeMarkerPath}\n`);
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
        "skip-apply": { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
        json: { type: "boolean", default: false },
      },
    });

    if (values.help || positionals[0] === "help") {
      printHelp(io);
      return 0;
    }

    const [command, rootArg] = positionals;
    if (!command) {
      throw new UsageError("Missing command.\n" + USAGE);
    }

    const root = resolve(rootArg ?? process.cwd());
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

    if (command === "apply" || command === "init") {
      const applied =
        command === "init"
          ? await initRepo({ ...common, dryRun: values["dry-run"] })
          : await applyPolicy({ ...common, dryRun: values["dry-run"] });
      printApply(
        io,
        { report: applied.report, reportPath: applied.reportPath, assessments: [] },
        applied.writes,
        applied.dryRun,
        applied.reportPath,
        Boolean(values.json),
        applied.changeMarker ? proveChangeLatestPath(root) : undefined,
      );
      return savingsExitCode(applied.report.totals);
    }

    if (command === "pilot") {
      const pilot = await runPilotPack({
        ...common,
        provider: values.provider ?? "copilot",
        dryRun: values["dry-run"],
        skipApply: values["skip-apply"],
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
      }
      return savingsExitCode(pilot.report.totals);
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

    if (command === "org-pack") {
      if (!rootArg) {
        throw new UsageError("org-pack requires a seed JSON path.\n" + USAGE);
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
        throw new UsageError("org-apply requires --org <slug>.\n" + USAGE);
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

    throw new UsageError(`Unknown command "${command}".\n` + USAGE);
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
