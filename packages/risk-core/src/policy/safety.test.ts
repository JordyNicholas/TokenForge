import { describe, expect, it } from "vitest";
import { scoreRisk } from "../score/score";
import { coerceLlmVerdict, isLlmExcludeSafe } from "./safety";

describe("isLlmExcludeSafe", () => {
  it("allows exclude on instruction paths with semantic_bloat", () => {
    expect(
      isLlmExcludeSafe({
        path: "AGENTS.md",
        reason: "semantic_bloat",
      }),
    ).toBe(true);
  });

  it("allows exclude on .cursor/rules paths", () => {
    expect(
      isLlmExcludeSafe({
        path: ".cursor/rules/testing.mdc",
        reason: "redundant_instructions",
      }),
    ).toBe(true);
  });

  it("blocks exclude on application source", () => {
    expect(
      isLlmExcludeSafe({
        path: "src/generated-types.ts",
        reason: "semantic_bloat",
        fileClass: "source",
      }),
    ).toBe(false);
  });

  it("blocks exclude on protected configs", () => {
    expect(
      isLlmExcludeSafe({
        path: "tsconfig.json",
        reason: "low_signal_config",
        fileClass: "config",
      }),
    ).toBe(false);
  });

  it("blocks exclude on API contracts", () => {
    expect(
      isLlmExcludeSafe({
        path: "openapi.json",
        reason: "low_signal_config",
        fileClass: "config",
      }),
    ).toBe(false);
  });

  it("blocks advisory duplicate reasons", () => {
    expect(
      isLlmExcludeSafe({
        path: "src/a.ts",
        reason: "duplicate_logic",
        fileClass: "source",
      }),
    ).toBe(false);
    expect(
      isLlmExcludeSafe({
        path: "packages/a/tsconfig.json",
        reason: "redundant_config",
        fileClass: "config",
      }),
    ).toBe(false);
  });

  it("blocks heuristic-only reasons if a backend emits them", () => {
    expect(
      isLlmExcludeSafe({
        path: "package-lock.json",
        reason: "high_risk_filetype",
      }),
    ).toBe(false);
  });
});

describe("coerceLlmVerdict", () => {
  it("downgrades unsafe exclude to review", () => {
    expect(
      coerceLlmVerdict({
        path: "src/util.ts",
        reason: "semantic_bloat",
        verdict: "exclude",
        fileClass: "source",
      }),
    ).toBe("review");
  });

  it("keeps safe exclude", () => {
    expect(
      coerceLlmVerdict({
        path: ".cursor/rules/testing.mdc",
        reason: "redundant_instructions",
        verdict: "exclude",
      }),
    ).toBe("exclude");
  });

  it("passes through review and keep", () => {
    expect(
      coerceLlmVerdict({
        path: "src/util.ts",
        reason: "semantic_bloat",
        verdict: "review",
        fileClass: "source",
      }),
    ).toBe("review");
  });
});

describe("heuristic-edge-app paths", () => {
  it("never marks protected paths safe to exclude via LLM", () => {
    for (const path of ["tsconfig.json", "openapi.json"]) {
      expect(
        isLlmExcludeSafe({ path, reason: "semantic_bloat" }),
      ).toBe(false);
    }
  });

  it("never marks oversized-only source safe to exclude via LLM", () => {
    const assessment = scoreRisk({
      path: "src/generated-types.ts",
      bytes: 120_173,
      inactiveMs: 0,
    });
    expect(assessment.fileClass).toBe("source");
    expect(
      isLlmExcludeSafe({
        path: assessment.path,
        reason: "semantic_bloat",
        fileClass: assessment.fileClass,
      }),
    ).toBe(false);
  });
});
