import { describe, expect, it } from "vitest";
import type { RiskAssessment } from "../domain/types";
import { selectEnrichmentCandidates } from "./candidates";

function assessment(
  path: string,
  bytes: number,
  overrides: Partial<RiskAssessment> = {},
): RiskAssessment {
  return {
    path,
    bytes,
    estTokens: Math.ceil(bytes / 4),
    fileClass: "unknown",
    score: 0,
    atRisk: false,
    reasons: [],
    ...overrides,
  };
}

describe("selectEnrichmentCandidates", () => {
  it("prioritizes instruction paths", () => {
    const assessments = [
      assessment("src/index.ts", 500, { fileClass: "source" }),
      assessment("AGENTS.md", 9000, { fileClass: "unknown" }),
      assessment("package-lock.json", 900_000, {
        fileClass: "lockfile",
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
    ];

    const selected = selectEnrichmentCandidates(assessments);
    expect(selected.map((item) => item.path)).toContain("AGENTS.md");
  });

  it("includes borderline config paths and caps duplicates", () => {
    const assessments = [
      assessment("config/app-settings.json", 8_192, { fileClass: "config" }),
      assessment("config/app-settings.json", 8_192, { fileClass: "config" }),
      assessment("README.md", 16_384, { fileClass: "unknown" }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { maxCandidates: 2 });
    expect(selected).toHaveLength(2);
    expect(selected.filter((item) => item.path === "config/app-settings.json")).toHaveLength(1);
  });

  it("picks the top-N largest eligible files, excluding lockfile/generated classes", () => {
    const assessments = [
      assessment("src/big-a.ts", 9_000, { fileClass: "source" }),
      assessment("src/big-b.ts", 8_000, { fileClass: "source" }),
      assessment("src/big-c.ts", 7_000, { fileClass: "source" }),
      assessment("package-lock.json", 900_000, {
        fileClass: "lockfile",
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
      assessment("dist/bundle.js", 500_000, {
        fileClass: "generated",
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { topCount: 2 });

    expect(selected.map((item) => item.path)).toEqual(["src/big-a.ts", "src/big-b.ts"]);
    expect(selected.some((item) => item.fileClass === "lockfile")).toBe(false);
    expect(selected.some((item) => item.fileClass === "generated")).toBe(false);
  });

  it("orders the top bucket by bytes desc, then path asc on ties", () => {
    const assessments = [
      assessment("src/z.ts", 5_000, { fileClass: "source" }),
      assessment("src/a.ts", 5_000, { fileClass: "source" }),
      assessment("src/m.ts", 3_000, { fileClass: "source" }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { topCount: 3 });

    expect(selected.map((item) => item.path)).toEqual(["src/a.ts", "src/z.ts", "src/m.ts"]);
  });

  it("caps at 30 candidates by default when no maxCandidates is given", () => {
    // Borderline bucket has no per-bucket limit, so 40 borderline configs exercise
    // the function's own default cap (30) rather than the topCount default (10).
    const assessments = Array.from({ length: 40 }, (_, index) =>
      assessment(`config/file-${index}.json`, 10_000 - index, { fileClass: "config" }),
    );

    const selected = selectEnrichmentCandidates(assessments);

    expect(selected).toHaveLength(30);
  });

  it("dedupes a path that qualifies for multiple buckets, keeping instruction priority", () => {
    const assessments = [
      assessment("AGENTS.md", 50_000, { fileClass: "unknown" }),
      assessment("src/small.ts", 1_000, { fileClass: "source" }),
    ];

    const selected = selectEnrichmentCandidates(assessments, { topCount: 5 });

    expect(selected.filter((item) => item.path === "AGENTS.md")).toHaveLength(1);
    expect(selected[0].path).toBe("AGENTS.md");
  });
});
