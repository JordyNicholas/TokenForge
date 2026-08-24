import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isUsageMetrics } from "@tokenforge/risk-core";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tokenforgeDir } from "../../io/paths";
import { currentUsagePeriodLabel, parseUsageSyncConfig, syncUsage } from "./usage-sync";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const examplePath = resolve(
  repoRoot,
  "../docs/schemas/examples/usage-metrics.v0.json",
);

describe("usage-sync", () => {
  it("parses config JSON", () => {
    expect(parseUsageSyncConfig({ provider: "copilot", org: "acme" })).toEqual({
      provider: "copilot",
      org: "acme",
    });
  });

  it("syncs fixture usage into .tokenforge using config defaults", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-usage-sync-"));
    try {
      await mkdir(tokenforgeDir(root), { recursive: true });
      await writeFile(
        join(root, ".tokenforge/usage-sync.json"),
        `${JSON.stringify({
          provider: "fixture",
          period: "2026-08",
        })}\n`,
        "utf8",
      );
      const result = await syncUsage({
        root,
        fixtureFile: examplePath,
      });
      expect(result.provider).toBe("fixture");
      expect(result.period).toBe("2026-08");
      expect(result.periodPath).toBe(join(root, ".tokenforge/usage-2026-08.json"));
      const saved = JSON.parse(await readFile(result.periodPath!, "utf8")) as unknown;
      expect(isUsageMetrics(saved)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("defaults period to current UTC month", () => {
    expect(currentUsagePeriodLabel(new Date("2026-08-15T12:00:00Z"))).toBe("2026-08");
  });
});
