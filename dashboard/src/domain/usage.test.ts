import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseUsageCsv, parseUsageJson, parseUsageText } from "./parseUsage";
import { isUsageMetrics, usageForTeam } from "./usage";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readPublic(name: string): string {
  return readFileSync(resolve(repoRoot, "dashboard/public", name), "utf8");
}

describe("usage contract", () => {
  it("validates and slices usage metrics", () => {
    const usage = {
      source: "demo" as const,
      providerLabel: "demo",
      period: "2026-08",
      teams: [{ team: "checkout", creditsUsed: 10, estimatedUsd: 2 }],
      totals: { creditsUsed: 10, estimatedUsd: 2 },
    };
    expect(isUsageMetrics(usage)).toBe(true);
    expect(usageForTeam(usage, null)?.creditsUsed).toBe(10);
    expect(usageForTeam(usage, "checkout")?.estimatedUsd).toBe(2);
    expect(usageForTeam(usage, "missing")).toBeNull();
  });
});

describe("parseUsageJson", () => {
  it("loads the demo usage fixture as UsageMetrics", () => {
    const usage = parseUsageJson(readPublic("demo-usage.json"), "demo");
    expect(usage.source).toBe("demo");
    expect(usage.period).toBe("2026-08");
    expect(usage.totals.creditsUsed).toBe(31200);
    expect(usage.teams).toHaveLength(4);
  });

  it("unwraps usage nested on a seed and fills missing totals", () => {
    const usage = parseUsageJson(
      JSON.stringify({
        usage: {
          providerLabel: "cursor",
          period: "2026-07",
          teams: [{ team: "checkout", creditsUsed: 8, estimatedUsd: 12 }],
        },
      }),
    );
    expect(usage.source).toBe("import");
    expect(usage.providerLabel).toBe("cursor");
    expect(usage.totals).toEqual({ creditsUsed: 8, estimatedUsd: 12 });
  });

  it("accepts a bare teams array", () => {
    const usage = parseUsageJson(
      JSON.stringify([{ team: "checkout", creditsUsed: 3, estimatedUsd: 4 }]),
    );
    expect(usage.totals.estimatedUsd).toBe(4);
    expect(usage.providerLabel).toBe("imported export");
  });
});

describe("parseUsageCsv", () => {
  it("maps FinOps aliases and meta comments from the sample export", () => {
    const usage = parseUsageCsv(readPublic("sample-usage.csv"));
    expect(usage.source).toBe("import");
    expect(usage.providerLabel).toBe("Copilot (sanitized FinOps export)");
    expect(usage.period).toBe("2026-08");
    expect(usage.totals).toEqual({ creditsUsed: 31200, estimatedUsd: 4680 });
    expect(usageForTeam(usage, "checkout")?.estimatedUsd).toBe(1230);
  });

  it("merges duplicate team rows and quoted commas", () => {
    const usage = parseUsageCsv(`team,tokens,usd
checkout,10,1
checkout,5,"2,000"
`);
    expect(usage.teams).toEqual([
      { team: "checkout", creditsUsed: 15, estimatedUsd: 2001 },
    ]);
  });

  it("rejects CSV without a $ column", () => {
    expect(() => parseUsageCsv("team,credits\ncheckout,1\n")).toThrow(/cost\/usd/i);
  });
});

describe("parseUsageText", () => {
  it("picks CSV vs JSON from the file name", () => {
    expect(parseUsageText(readPublic("sample-usage.csv"), "bill.csv").source).toBe(
      "import",
    );
    expect(parseUsageText(readPublic("demo-usage.json"), "usage.json").period).toBe(
      "2026-08",
    );
  });
});
