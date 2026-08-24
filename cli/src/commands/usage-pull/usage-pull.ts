import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { UsageError } from "../../app/errors";
import { writeUsageMetricsFiles } from "../../io/usage-file";
import { getUsageProvider } from "../../usage/registry";
import type { UsageProviderId } from "../../usage/types";

export type UsagePullOptions = {
  provider: UsageProviderId;
  org?: string;
  period: string;
  teamScope?: string;
  /** Required for fixture provider. */
  fixtureFile?: string;
  /** Explicit output path (`--out`). */
  outPath?: string;
  /** Repo root for default `.tokenforge/usage-YYYY-MM.json` writes (#94). */
  root?: string;
};

export type UsagePullResult = {
  provider: UsageProviderId;
  outPath?: string;
  periodPath?: string;
  latestPath?: string;
  metrics: Awaited<ReturnType<ReturnType<typeof getUsageProvider>["fetchUsage"]>>;
};

/** On-demand usage pull for Prove (#90 adapter; #94 adds `.tokenforge/` persistence). */
export async function pullUsage(options: UsagePullOptions): Promise<UsagePullResult> {
  const period = options.period?.trim();
  if (!period) {
    throw new UsageError("usage pull requires --period YYYY-MM.");
  }

  const provider = getUsageProvider(options.provider, {
    fixture: options.fixtureFile ? { filePath: options.fixtureFile } : undefined,
    copilot:
      options.provider === "copilot" || options.provider === undefined
        ? { org: options.org }
        : undefined,
    cursor: options.provider === "cursor" ? { organizationId: options.org } : undefined,
    claude: options.provider === "claude" ? {} : undefined,
  });

  const metrics = await provider.fetchUsage({
    org: options.org,
    period,
    teamScope: options.teamScope ?? null,
  });

  let periodPath: string | undefined;
  let latestPath: string | undefined;
  let outPath = options.outPath;

  if (options.root) {
    const written = await writeUsageMetricsFiles({
      root: options.root,
      metrics,
      explicitOutPath: options.outPath,
    });
    periodPath = written.periodPath;
    latestPath = written.latestPath;
    outPath = options.outPath ?? written.periodPath;
  } else if (options.outPath) {
    await mkdir(dirname(options.outPath), { recursive: true });
    await writeFile(options.outPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  }

  return {
    provider: options.provider,
    outPath,
    periodPath,
    latestPath,
    metrics,
  };
}
