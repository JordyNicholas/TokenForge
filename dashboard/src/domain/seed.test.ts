import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTokenRiskReport } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";
import { scenarioSavedPercent, tokenSavedPercent } from "./calculator";
import { tokensByFileClass, listFindings, topOffenders } from "./offenders";
import {
  aggregateTotals,
  parseDashboardDocument,
  resolveBootSourceUrl,
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

describe("listFindings", () => {
  it("includes kept LLM review rows", () => {
    const rows = listFindings(demoSeed().reports, { includeKept: true });
    const review = rows.find((row) => row.path === "AGENTS.md");
    expect(review?.action).toBe("kept");
    expect(review?.source).toBe("llm");
    expect(review?.detail).toMatch(/README/);
    expect(review?.suggestion?.kind).toBe("dedupe_rules");
  });

  it("can hide kept rows", () => {
    const rows = listFindings(demoSeed().reports, { includeKept: false });
    expect(rows.some((row) => row.action === "kept")).toBe(false);
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

describe("resolveBootSourceUrl", () => {
  it("accepts same-origin paths and http(s) URLs", () => {
    expect(resolveBootSourceUrl("?src=/last-scan.json")).toBe("/last-scan.json");
    expect(resolveBootSourceUrl("?src=https://example.com/r.json")).toBe(
      "https://example.com/r.json",
    );
  });

  it("rejects missing or unsafe values", () => {
    expect(resolveBootSourceUrl("")).toBeNull();
    expect(resolveBootSourceUrl("?other=1")).toBeNull();
    expect(resolveBootSourceUrl("?src=javascript:alert(1)")).toBeNull();
    expect(resolveBootSourceUrl("?src=//evil.example/x")).toBeNull();
    expect(resolveBootSourceUrl("?src=file:///tmp/x.json")).toBeNull();
  });
});
