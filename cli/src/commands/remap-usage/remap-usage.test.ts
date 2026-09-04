import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { remapUsage } from "./remap-usage";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function tempRoot(prefix: string): string {
  const root = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  roots.push(root);
  return root;
}

describe("remapUsage", () => {
  it("writes remapped UsageMetrics JSON", async () => {
    const root = tempRoot("tf-remap-usage");
    await mkdir(root, { recursive: true });
    const mapPath = join(root, "map.json");
    const inPath = join(root, "usage.json");
    const outPath = join(root, "out.json");
    await writeFile(
      mapPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          map: { "Payments Platform": "payments-platform" },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      inPath,
      `${JSON.stringify(
        {
          source: "import",
          providerLabel: "Copilot",
          period: "2026-08",
          teams: [
            { team: "Payments Platform", creditsUsed: 100, estimatedUsd: 15 },
            { team: "checkout", creditsUsed: 50, estimatedUsd: 7.5 },
          ],
          totals: { creditsUsed: 150, estimatedUsd: 22.5 },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await remapUsage({ mapPath, inPath, outPath });
    expect(result.remappedCount).toBe(1);
    expect(result.metrics.teams[0]?.team).toBe("payments-platform");
    expect(result.metrics.teams[1]?.team).toBe("checkout");
  });
});
