import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isUsageMetrics } from "@tokenforge/risk-core";
import { UsageError } from "../../app/errors";
import { usageSyncConfigPath } from "../../io/paths";
import { pullUsage } from "../usage-pull/usage-pull";
import type { UsageProviderId } from "../../usage/types";

export type UsageSyncConfig = {
  provider?: UsageProviderId;
  org?: string;
  teamScope?: string | null;
  period?: string;
};

export type UsageSyncOptions = {
  root: string;
  provider?: UsageProviderId;
  org?: string;
  period?: string;
  teamScope?: string;
  fixtureFile?: string;
  /** Override config file path (default: `.tokenforge/usage-sync.json`). */
  configPath?: string;
  /** When true, skip writing `.tokenforge/` snapshots. */
  skipWrite?: boolean;
  outPath?: string;
};

export type UsageSyncResult = {
  provider: UsageProviderId;
  period: string;
  periodPath?: string;
  latestPath?: string;
  metrics: Awaited<ReturnType<typeof pullUsage>>["metrics"];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseUsageSyncConfig(raw: unknown): UsageSyncConfig {
  if (!isRecord(raw)) {
    throw new UsageError("usage-sync config must be a JSON object.");
  }
  const config: UsageSyncConfig = {};
  if (raw.provider !== undefined) {
    if (typeof raw.provider !== "string" || !raw.provider.trim()) {
      throw new UsageError('usage-sync config "provider" must be a non-empty string.');
    }
    config.provider = raw.provider.trim();
  }
  if (raw.org !== undefined) {
    if (typeof raw.org !== "string" || !raw.org.trim()) {
      throw new UsageError('usage-sync config "org" must be a non-empty string.');
    }
    config.org = raw.org.trim();
  }
  if (raw.period !== undefined) {
    if (typeof raw.period !== "string" || !raw.period.trim()) {
      throw new UsageError('usage-sync config "period" must be YYYY-MM.');
    }
    config.period = raw.period.trim();
  }
  if (raw.teamScope !== undefined && raw.teamScope !== null) {
    if (typeof raw.teamScope !== "string" || !raw.teamScope.trim()) {
      throw new UsageError('usage-sync config "teamScope" must be a string or null.');
    }
    config.teamScope = raw.teamScope.trim();
  } else if (raw.teamScope === null) {
    config.teamScope = null;
  }
  return config;
}

export async function readUsageSyncConfig(path: string): Promise<UsageSyncConfig | null> {
  try {
    const text = await readFile(path, "utf8");
    return parseUsageSyncConfig(JSON.parse(text) as unknown);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    if (error instanceof UsageError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new UsageError(`Could not read usage-sync config at ${path}: ${detail}`);
  }
}

/** Current UTC billing month (`YYYY-MM`). */
export function currentUsagePeriodLabel(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function syncUsage(options: UsageSyncOptions): Promise<UsageSyncResult> {
  const root = resolve(options.root);
  const configPath = options.configPath ?? usageSyncConfigPath(root);
  const config = (await readUsageSyncConfig(configPath)) ?? {};

  const provider = options.provider ?? config.provider ?? "copilot";
  const org = options.org ?? config.org;
  const period = options.period?.trim() || config.period?.trim() || currentUsagePeriodLabel();
  const teamScope = options.teamScope ?? config.teamScope ?? undefined;

  const pull = await pullUsage({
    provider,
    org,
    period,
    teamScope: teamScope ?? undefined,
    fixtureFile: options.fixtureFile,
    root: options.skipWrite ? undefined : root,
    outPath: options.outPath,
  });

  return {
    provider: pull.provider,
    period: pull.metrics.period,
    periodPath: pull.periodPath,
    latestPath: pull.latestPath,
    metrics: pull.metrics,
  };
}
