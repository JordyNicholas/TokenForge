import { describe, expect, it } from "vitest";
import { mergeReportsToSeed, SeedLoadError } from "./seed";

const report = (team: string, repo: string, saved: number) => ({
  source: "cli",
  timestamp: "2026-01-01T00:00:00.000Z",
  team,
  repo,
  provider: "generic",
  findings: [],
  totals: { beforeTokens: saved + 10, afterTokens: 10, savedTokens: saved },
});

describe("mergeReportsToSeed", () => {
  it("rolls multiple single reports into one BU seed", () => {
    const seed = mergeReportsToSeed(
      [report("payments", "pay-api", 100), report("checkout", "cart", 50)],
      "Retail Banking",
    );
    expect(seed.businessUnit).toBe("Retail Banking");
    expect(seed.reports).toHaveLength(2);
    expect(seed.reports.map((row) => row.team).sort()).toEqual(["checkout", "payments"]);
  });

  it("dedupes team:repo keeping the later file", () => {
    const seed = mergeReportsToSeed([
      report("payments", "pay-api", 100),
      report("payments", "pay-api", 200),
    ]);
    expect(seed.reports).toHaveLength(1);
    expect(seed.reports[0]?.totals.savedTokens).toBe(200);
  });

  it("rejects an empty selection", () => {
    expect(() => mergeReportsToSeed([])).toThrow(SeedLoadError);
  });
});
