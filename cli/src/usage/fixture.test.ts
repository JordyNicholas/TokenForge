import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isUsageMetrics, type UsageMetrics } from "@tokenforge/risk-core";
import { UsageError } from "../app/errors";
import {
  createFixtureUsageProvider,
  getUsageProvider,
} from "./index";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const examplePath = resolve(
  repoRoot,
  "../docs/schemas/examples/usage-metrics.v0.json",
);

function readExample(): UsageMetrics {
  const parsed = JSON.parse(readFileSync(examplePath, "utf8")) as unknown;
  if (!isUsageMetrics(parsed)) {
    throw new Error("example fixture is not UsageMetrics");
  }
  return parsed;
}

describe("UsageProvider fixture adapter", () => {
  it("loads UsageMetrics from the shared example JSON", async () => {
    const provider = createFixtureUsageProvider({ filePath: examplePath });
    expect(provider.id).toBe("fixture");
    const usage = await provider.fetchUsage({ period: "2026-08" });
    expect(usage.totals.creditsUsed).toBe(31200);
    expect(usage.teams).toHaveLength(4);
  });

  it("filters by teamScope and recomputes totals", async () => {
    const provider = createFixtureUsageProvider({ metrics: readExample() });
    const usage = await provider.fetchUsage({
      period: "2026-08",
      teamScope: "checkout",
    });
    expect(usage.teams).toEqual([
      { team: "checkout", creditsUsed: 8200, estimatedUsd: 1230 },
    ]);
    expect(usage.totals).toEqual({ creditsUsed: 8200, estimatedUsd: 1230 });
  });

  it("rejects period mismatch", async () => {
    const provider = createFixtureUsageProvider({ metrics: readExample() });
    await expect(provider.fetchUsage({ period: "2026-09" })).rejects.toBeInstanceOf(
      UsageError,
    );
  });

  it("rejects configured org mismatch", async () => {
    const provider = createFixtureUsageProvider({
      metrics: readExample(),
      org: "acme",
    });
    await expect(
      provider.fetchUsage({ org: "other", period: "2026-08" }),
    ).rejects.toThrow(/org mismatch/i);
  });

  it("resolves fixture via getUsageProvider", async () => {
    const provider = getUsageProvider("fixture", {
      fixture: { metrics: readExample() },
    });
    const usage = await provider.fetchUsage({ period: "2026-08", org: undefined });
    expect(usage.providerLabel).toContain("demo");
  });

  it("rejects unknown usage provider ids", () => {
    expect(() => getUsageProvider("unknown-vendor")).toThrow(/Supported:/i);
  });
});
