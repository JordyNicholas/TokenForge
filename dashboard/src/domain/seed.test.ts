import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTokenRiskReport } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import { scenarioSavedPercent, tokenSavedPercent } from "./calculator";
import { tokensByFileClass, topOffenders } from "./offenders";
import {
  aggregateTotals,
  parseDashboardDocument,
  type DashboardSeed,
} from "./seed";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

function demoSeed(): DashboardSeed {
  return parseDashboardDocument(readJson("dashboard/public/demo-seed.json"));
}

describe("demo-seed.json", () => {
  it("is a valid Token Risk report per team", () => {
    expect(demoSeed().reports.every(isTokenRiskReport)).toBe(true);
  });

  it("hits 30.0% on default assumptions", () => {
    const totals = aggregateTotals(demoSeed().reports);
    expect(tokenSavedPercent(totals)).toBe(30);
    expect(scenarioSavedPercent(totals, DEFAULT_ASSUMPTIONS)).toBe(30);
  });

  it("keeps noisy-app totals on payments-platform", () => {
    const pin = readJson("fixtures/expected/noisy-app-totals.json") as {
      totals: { beforeTokens: number; afterTokens: number; savedTokens: number };
    };
    const payments = demoSeed().reports.find(
      (report) => report.team === "payments-platform",
    );
    expect(payments?.totals).toEqual(pin.totals);
    expect(tokenSavedPercent(payments?.totals ?? pin.totals)).toBe(99.8);
  });
});

describe("parseDashboardDocument", () => {
  it("wraps a single Token Risk report", () => {
    const example = readJson("docs/schemas/examples/scan-report.v0.json");
    const seed = parseDashboardDocument(example);
    expect(seed.reports).toHaveLength(1);
    expect(seed.businessUnit).toBe("payments-platform");
  });

  it("rejects unrelated JSON", () => {
    expect(() => parseDashboardDocument({ totals: { beforeTokens: 1 } })).toThrow(
      /Token Risk report/,
    );
  });
});

describe("topOffenders", () => {
  it("lists the noisy-app lockfile first", () => {
    const [first] = topOffenders(demoSeed().reports, 3);
    expect(first?.path).toBe("package-lock.json");
    expect(first?.team).toBe("payments-platform");
    expect(first?.fileClass).toBe("lockfile");
  });
});

describe("tokensByFileClass", () => {
  it("orders classes by wasted tokens", () => {
    const buckets = tokensByFileClass(demoSeed().reports);
    expect(buckets[0]?.fileClass).toBe("lockfile");
    expect(buckets.map((bucket) => bucket.fileClass)).toEqual(
      expect.arrayContaining(["lockfile", "generated", "config"]),
    );
  });
});
