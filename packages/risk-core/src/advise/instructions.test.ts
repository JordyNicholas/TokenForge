import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MAX_LEAN_INSTRUCTION_BYTES } from "../domain/constants";
import type { TokenRiskReport } from "../domain/types";
import { synthesizeLeanInstructions } from "./instructions";

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
    expect(md).toContain("## Prefer");
    expect(md).not.toContain("## Instruction hygiene");
    expect(md).not.toContain("## Why");
    expect(utf8Bytes(md)).toBeLessThanOrEqual(MAX_LEAN_INSTRUCTION_BYTES);
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
    // bullet in a synthesized AGENTS.md. Its suggestion kind is `review`
    // precisely so it falls outside HYGIENE_KINDS.
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
