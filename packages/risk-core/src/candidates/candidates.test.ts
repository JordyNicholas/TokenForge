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
});
