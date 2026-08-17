import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { UsageError, isCliError } from "./errors";
import { writeScanReport } from "./report-file";
import { scanRepo } from "./scan";
import { formatScanTable } from "./table";

const USAGE = `Usage: tokenforge <command> [root] [options]

Commands:
  scan [root]   Score high-risk paths and write .tokenforge/scan-report.json

Options:
  --team <name>         Team label (default: local)
  --repo <name>         Repo label (default: directory name)
  --provider <id>       copilot | cursor | claude | generic (default: generic)
  -h, --help            Show this help
`;

export type CliIo = {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
};

function printHelp(io: CliIo): void {
  io.stdout.write(`${USAGE}\n`);
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
    if (command !== "scan") {
      throw new UsageError(`Unknown command "${command}".\n` + USAGE);
    }

    const result = await scanRepo({
      root: resolve(rootArg ?? process.cwd()),
      team: values.team,
      repo: values.repo,
      provider: values.provider,
    });

    await writeScanReport(result.reportPath, result.report);
    io.stdout.write(formatScanTable(result));
    io.stdout.write(`wrote ${result.reportPath}\n`);
    return 0;
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
