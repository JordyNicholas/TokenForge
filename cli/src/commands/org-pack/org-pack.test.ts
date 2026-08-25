import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isProveChangeMarker } from "@tokenforge/risk-core";
import { applyOrgPack } from "./org-pack";
import { getAdapter } from "../../adapters";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const demoSeed = join(repoRoot, "dashboard/public/demo-seed.json");

describe("org-pack", () => {
  it("aggregates demo seed and renders provider files (dry-run)", async () => {
    const result = await applyOrgPack({
      seedPath: demoSeed,
      provider: "generic",
      dryRun: true,
    });
    expect(result.businessUnit).toBe("Retail Banking");
    expect(result.report.totals.savedTokens).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.changeMarker).toBeUndefined();
    expect(result.files.every((file) => file.path.includes("org-policy"))).toBe(
      true,
    );
  });

  it("writes under out root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tokenforge-org-"));
    try {
      const result = await applyOrgPack({
        seedPath: demoSeed,
        outRoot: dir,
        provider: "cursor",
        dryRun: false,
      });
      expect(result.files.some((file) => file.path.includes(".cursor"))).toBe(
        true,
      );
      expect(result.changeMarker).toMatchObject({
        provider: "cursor",
        packId: "org-pack:cursor:Retail Banking",
        action: "org-pack",
        businessUnit: "Retail Banking",
      });
      expect(isProveChangeMarker(result.changeMarker)).toBe(true);

      const latest = JSON.parse(
        await readFile(join(dir, ".tokenforge/prove-change-latest.json"), "utf8"),
      ) as unknown;
      expect(isProveChangeMarker(latest)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("cursor / claude adapters", () => {
  it("render without throwing", () => {
    const report = {
      source: "cli" as const,
      timestamp: new Date().toISOString(),
      repo: "demo",
      team: "demo",
      provider: "cursor" as const,
      findings: [
        {
          path: "package-lock.json",
          reason: "high_risk_filetype" as const,
          bytes: 1000,
          estTokens: 250,
          action: "excluded" as const,
        },
      ],
      totals: { beforeTokens: 250, afterTokens: 0, savedTokens: 250 },
    };
    expect(getAdapter("cursor").render(report).length).toBe(2);
    expect(getAdapter("claude").render({ ...report, provider: "claude" }).length).toBe(
      2,
    );
  });
});
