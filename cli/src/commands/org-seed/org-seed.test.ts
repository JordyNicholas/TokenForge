import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { mergeScanDocuments, rollupOrgSeed } from "./org-seed";

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

const sampleReport = (team: string, repo: string, saved: number) => ({
  source: "cli",
  timestamp: "2026-01-01T00:00:00.000Z",
  team,
  repo,
  provider: "generic",
  findings: [],
  totals: { beforeTokens: saved + 10, afterTokens: 10, savedTokens: saved },
});

describe("mergeScanDocuments", () => {
  it("dedupes team:repo keeping the later document", () => {
    const seed = mergeScanDocuments(
      [
        { businessUnit: "a", reports: [sampleReport("payments", "pay-api", 100)] },
        { businessUnit: "b", reports: [sampleReport("payments", "pay-api", 200)] },
      ],
      "Retail Banking",
    );
    expect(seed.businessUnit).toBe("Retail Banking");
    expect(seed.reports).toHaveLength(1);
    expect(seed.reports[0]?.totals.savedTokens).toBe(200);
  });
});

describe("rollupOrgSeed", () => {
  it("walks a directory tree and writes org-seed.json", async () => {
    const root = tempRoot("tf-org-seed");
    const repoA = join(root, "team-a");
    const repoB = join(root, "team-b");
    await mkdir(join(repoA, ".tokenforge"), { recursive: true });
    await mkdir(join(repoB, ".tokenforge"), { recursive: true });
    await writeFile(
      join(repoA, ".tokenforge", "scan-report.json"),
      `${JSON.stringify(sampleReport("payments", "pay-api", 100), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(repoB, ".tokenforge", "last-scan.json"),
      `${JSON.stringify(sampleReport("checkout", "cart", 50), null, 2)}\n`,
      "utf8",
    );

    const outPath = join(root, "bu-seed.json");
    const result = await rollupOrgSeed({
      root,
      businessUnit: "Retail Banking",
      out: outPath,
    });

    expect(result.reportCount).toBe(2);
    expect(result.sourceFiles).toEqual([
      "team-a/.tokenforge/scan-report.json",
      "team-b/.tokenforge/last-scan.json",
    ]);
    expect(result.outPath).toBe(outPath);
    expect(result.seed.businessUnit).toBe("Retail Banking");
    expect(result.seed.reports.map((row) => row.team).sort()).toEqual(["checkout", "payments"]);
  });
});
