import { writeFile } from "node:fs/promises";
import { UsageError } from "../../app/errors";
import { getUsageProvider } from "../../usage/registry";
import type { UsageProviderId } from "../../usage/types";

export type UsagePullOptions = {
  provider: UsageProviderId;
  org?: string;
  period: string;
  teamScope?: string;
  /** Required for fixture provider. */
  fixtureFile?: string;
  outPath?: string;
};

export type UsagePullResult = {
  provider: UsageProviderId;
  outPath?: string;
  metrics: Awaited<ReturnType<ReturnType<typeof getUsageProvider>["fetchUsage"]>>;
};

/** On-demand usage pull for Prove (#90 adapter; #94 adds scheduling). */
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
  });

  const metrics = await provider.fetchUsage({
    org: options.org,
    period,
    teamScope: options.teamScope ?? null,
  });

  if (options.outPath) {
    await writeFile(options.outPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  }

  return {
    provider: options.provider,
    outPath: options.outPath,
    metrics,
  };
}
