import { describe, expect, it, vi } from "vitest";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  synthesizePolicyHeuristic,
  synthesizePolicyHybrid,
} from "./synthesizer";
import type { PolicySynthesisInput } from "./types";

/**
 * Shaped like `fixtures/hybrid-eval-app`: instruction sprawl plus lockfile and
 * CI output, with living source that no glob may claim.
 */
const report: TokenRiskReport = {
  source: "cli",
  timestamp: "2026-01-01T00:00:00.000Z",
  repo: "checkout-api",
  team: "payments-platform",
  provider: "copilot",
  findings: [
    {
      path: "package-lock.json",
      reason: "high_risk_filetype",
      bytes: 400_000,
      estTokens: 100_000,
      action: "excluded",
      source: "heuristic",
    },
    {
      path: "coverage/lcov.info",
      reason: "high_risk_filetype",
      bytes: 200_000,
      estTokens: 50_000,
      action: "excluded",
      source: "heuristic",
    },
    {
      path: "test-results/junit.xml",
      reason: "high_risk_filetype",
      bytes: 120_000,
      estTokens: 30_000,
      action: "excluded",
      source: "heuristic",
    },
  ],
  totals: { beforeTokens: 200_000, afterTokens: 20_000, savedTokens: 180_000 },
  instructionBudget: {
    alwaysOnTokens: 6_000,
    recommendedMax: 4_096,
    overBudget: true,
    files: [
      { path: "AGENTS.md", estTokens: 2_400 },
      { path: ".github/copilot-instructions.md", estTokens: 2_100 },
      { path: "CLAUDE.md", estTokens: 1_500 },
    ],
  },
};

function input(overrides: Partial<PolicySynthesisInput> = {}): PolicySynthesisInput {
  return {
    report,
    title: "Copilot instructions (TokenForge)",
    instructionContents: new Map(),
    model: "composer-2.5",
    ...overrides,
  };
}

describe("hybrid policy synthesis falls back to the deterministic path", () => {
  it("uses heuristic synthesis when the LLM overruns the byte budget", async () => {
    const oversized = `# Copilot instructions (TokenForge)\n\n${"long policy prose. ".repeat(400)}`;
    const run = vi.fn(async () =>
      JSON.stringify({ markdown: oversized }),
    );
    const progress: string[] = [];

    const result = await synthesizePolicyHybrid(
      input({ maxBytes: 800, onProgress: (m) => progress.push(m) }),
      run,
    );

    expect(result.backend).toBe("heuristic");
    expect(Buffer.byteLength(result.markdown, "utf8")).toBeLessThanOrEqual(800);
    expect(progress.join("\n")).toContain("falling back to heuristic synthesis");
    // Byte-for-byte the deterministic pack — the fallback is not a degraded
    // variant, it is the same output `apply` writes with no --mode at all.
    expect(result.markdown).toBe(
      synthesizePolicyHeuristic(input({ maxBytes: 800 })).markdown,
    );
  });

  it("falls back when the LLM returns something that is not the envelope", async () => {
    const run = vi.fn(async () => "I cannot help with that.");
    const result = await synthesizePolicyHybrid(input({ maxBytes: 4_096 }), run);
    expect(result.backend).toBe("heuristic");
  });

  it("keeps the fallback pack honest about what it excludes", async () => {
    const run = vi.fn(async () => "not json");
    const result = await synthesizePolicyHybrid(input({ maxBytes: 4_096 }), run);

    expect(result.markdown).toContain("- `package-lock.json`");
    expect(result.markdown).toContain("## Do not load — build and CI output");
    // No repo-root glob, and no token counts anywhere in the rendered file.
    expect(result.markdown).not.toContain("`src/**`");
    expect(result.markdown).not.toContain("est. tokens");
    expect(result.markdown).toContain("over budget — trim `AGENTS.md`");
  });
});
