import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MAX_LEAN_INSTRUCTION_BYTES } from "../domain/constants";
import type { TokenRiskReport } from "../domain/types";
import { synthesizeLeanInstructions, shouldIncludeCompactOutputGuidance } from "./instructions";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

const heuristicReport: TokenRiskReport = {
  source: "cli",
  timestamp: "2026-08-17T18:00:00.000Z",
  repo: "fixtures/noisy-app",
  team: "payments-platform",
  provider: "copilot",
  findings: [
    {
      path: "package-lock.json",
      reason: "high_risk_filetype",
      bytes: 100,
      estTokens: 25,
      action: "excluded",
      source: "heuristic",
    },
    {
      path: "dist/bundle.js",
      reason: "high_risk_filetype",
      bytes: 200,
      estTokens: 50,
      action: "excluded",
      source: "heuristic",
    },
  ],
  totals: { beforeTokens: 100, afterTokens: 10, savedTokens: 90 },
};

describe("synthesizeLeanInstructions", () => {
  it("builds exclude + prefer sections from heuristic findings", () => {
    const md = synthesizeLeanInstructions(heuristicReport, {
      title: "Copilot instructions (TokenForge)",
    });
    expect(md).toContain("# Copilot instructions (TokenForge)");
    expect(md).toContain("## Do not load");
    expect(md).toContain("`package-lock.json`");
    expect(md).toContain("`dist/bundle.js`");
    expect(md).toContain("## Compact tool output");
    expect(md).toContain("does not intercept terminal output");
    expect(md).toContain("## Prefer");
    expect(md).not.toContain("## Instruction hygiene");
    expect(md).not.toContain("## Why");
    expect(utf8Bytes(md)).toBeLessThanOrEqual(MAX_LEAN_INSTRUCTION_BYTES);
  });

  it("omits compact tool output when no output-shape paths are flagged", () => {
    const lockfileOnly: TokenRiskReport = {
      ...heuristicReport,
      findings: [heuristicReport.findings[0]!],
    };
    expect(shouldIncludeCompactOutputGuidance(lockfileOnly.findings)).toBe(false);
    const md = synthesizeLeanInstructions(lockfileOnly);
    expect(md).not.toContain("## Compact tool output");
  });

  it("adds compact tool output for test and CI log findings", () => {
    const withOutputShape: TokenRiskReport = {
      ...heuristicReport,
      findings: [
        {
          path: "test-results/junit.xml",
          reason: "high_risk_filetype",
          bytes: 100,
          estTokens: 25,
          action: "excluded",
          source: "heuristic",
        },
        {
          path: "logs/ci-pipeline.log",
          reason: "high_risk_filetype",
          bytes: 100,
          estTokens: 30,
          action: "excluded",
          source: "heuristic",
        },
      ],
    };
    expect(shouldIncludeCompactOutputGuidance(withOutputShape.findings)).toBe(true);
    const md = synthesizeLeanInstructions(withOutputShape);
    expect(md).toContain("## Compact tool output");
    expect(md).toMatch(/test and lint/i);
  });

  it("adds hygiene and themes from a hybrid report", () => {
    const hybrid = readJson(
      "docs/schemas/examples/scan-report.hybrid.v0.json",
    ) as TokenRiskReport;
    const md = synthesizeLeanInstructions(hybrid);
    expect(md).toContain("## Do not load");
    expect(md).toContain("`package-lock.json`");
    expect(md).toContain("## Instruction hygiene");
    expect(md).toContain("`AGENTS.md`");
    expect(md).toMatch(/dedupe|duplicate|README/i);
    expect(md).toContain("## Why");
    expect(md).toContain("lockfiles");
    expect(md).toContain("redundant instructions");
    expect(utf8Bytes(md)).toBeLessThanOrEqual(MAX_LEAN_INSTRUCTION_BYTES);
  });

  it("keeps duplicate_logic findings out of the instruction hygiene section", () => {
    // duplicate_logic is about application code, so it must never become a
    // bullet in a synthesized AGENTS.md. Its suggestion kind is
    // `consolidate_duplicates` (not in HYGIENE_KINDS).
    const withDuplicateLogic: TokenRiskReport = {
      ...heuristicReport,
      findings: [
        ...heuristicReport.findings,
        {
          path: "src/utils/checkEmailFormat.js",
          reason: "duplicate_logic",
          bytes: 395,
          estTokens: 99,
          action: "kept",
          source: "llm",
        },
      ],
    };

    const md = synthesizeLeanInstructions(withDuplicateLogic);
    expect(md).not.toContain("## Instruction hygiene");
    expect(md).not.toContain("checkEmailFormat");
  });

  it("keeps redundant_config out of the hygiene section despite dedupe_rules", () => {
    // redundant_config reuses `dedupe_rules`, which IS in HYGIENE_KINDS — so
    // without an explicit guard it would land in the provider instruction file
    // that `apply` writes, putting build-config refactoring advice in front of
    // the agent on every turn. Reason-level skip, not kind-level (#136).
    const withRedundantConfig: TokenRiskReport = {
      ...heuristicReport,
      findings: [
        ...heuristicReport.findings,
        {
          path: "packages/b/tsconfig.json",
          reason: "redundant_config",
          bytes: 300,
          estTokens: 75,
          action: "kept",
          source: "llm",
        },
      ],
    };

    const md = synthesizeLeanInstructions(withRedundantConfig);
    expect(md).not.toContain("tsconfig.json");
    expect(md).not.toContain("shared base");
  });

  it("never writes a 'do not load' bullet for a path the developer has open", () => {
    // The finding still says `excluded` — this asserts the guard holds even
    // when the report reaching the synthesizer predates the session signal
    // or was hand-edited (#137).
    const excluded = heuristicReport.findings.find(
      (finding) => finding.action === "excluded",
    );
    expect(excluded).toBeDefined();

    const withActive: TokenRiskReport = {
      ...heuristicReport,
      activePaths: [excluded!.path],
    };

    expect(synthesizeLeanInstructions(heuristicReport)).toContain(excluded!.path);
    expect(synthesizeLeanInstructions(withActive)).not.toContain(excluded!.path);
  });

  it("is deterministic for the same report", () => {
    const a = synthesizeLeanInstructions(heuristicReport);
    const b = synthesizeLeanInstructions(heuristicReport);
    expect(a).toBe(b);
  });

  it("trims to the byte budget", () => {
    const findings = Array.from({ length: 40 }, (_, index) => ({
      path: `vendor/generated/file-${String(index).padStart(2, "0")}.js`,
      reason: "high_risk_filetype" as const,
      bytes: 10_000,
      estTokens: 10_000 - index,
      action: "excluded" as const,
      source: "heuristic" as const,
    }));
    const fat: TokenRiskReport = {
      ...heuristicReport,
      findings,
    };
    const md = synthesizeLeanInstructions(fat, { maxBytes: 400 });
    expect(utf8Bytes(md)).toBeLessThanOrEqual(400);
    expect(md).toContain("# TokenForge instructions");
  });
});
