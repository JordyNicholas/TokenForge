import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isUsageMetrics } from "@tokenforge/risk-core";
import { pullUsage } from "./usage-pull";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const examplePath = resolve(
  repoRoot,
  "../docs/schemas/examples/usage-metrics.v0.json",
);

describe("usage-pull persistence", () => {
  it("writes period + latest snapshots under .tokenforge when root is set", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-usage-pull-"));
    try {
      const result = await pullUsage({
        provider: "fixture",
        period: "2026-08",
        fixtureFile: examplePath,
        root,
      });
      expect(result.metrics.period).toBe("2026-08");
      expect(result.periodPath).toBe(join(root, ".tokenforge/usage-2026-08.json"));
      expect(result.latestPath).toBe(join(root, ".tokenforge/usage-latest.json"));

      const periodJson = JSON.parse(
        await readFile(result.periodPath!, "utf8"),
      ) as unknown;
      expect(isUsageMetrics(periodJson)).toBe(true);
      expect((periodJson as { source: string }).source).toBe("demo");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
