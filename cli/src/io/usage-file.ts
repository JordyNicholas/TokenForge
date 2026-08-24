import { mkdir, writeFile } from "node:fs/promises";
import type { UsageMetrics } from "@tokenforge/risk-core";
import { tokenforgeDir, usageLatestPath, usageMetricsPath } from "./paths";

export type WriteUsageMetricsOptions = {
  root: string;
  metrics: UsageMetrics;
  /** When set, also write this path (explicit `--out`). */
  explicitOutPath?: string;
};

export type WriteUsageMetricsResult = {
  periodPath: string;
  latestPath: string;
  /** Path written when `explicitOutPath` differs from period/latest. */
  extraPath?: string;
};

/** Persist UsageMetrics under `.tokenforge/` for Prove sync (#94). */
export async function writeUsageMetricsFiles(
  options: WriteUsageMetricsOptions,
): Promise<WriteUsageMetricsResult> {
  const periodPath = usageMetricsPath(options.root, options.metrics.period);
  const latestPath = usageLatestPath(options.root);
  const payload = `${JSON.stringify(options.metrics, null, 2)}\n`;

  await mkdir(tokenforgeDir(options.root), { recursive: true });
  await writeFile(periodPath, payload, "utf8");
  await writeFile(latestPath, payload, "utf8");

  let extraPath: string | undefined;
  if (options.explicitOutPath && options.explicitOutPath !== periodPath) {
    await writeFile(options.explicitOutPath, payload, "utf8");
    extraPath = options.explicitOutPath;
  }

  return { periodPath, latestPath, extraPath };
}
