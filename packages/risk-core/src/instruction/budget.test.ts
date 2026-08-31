import { describe, expect, it } from "vitest";
import { scoreRisk } from "../score/score";
import {
  buildInstructionHeuristicFindings,
  computeInstructionBudget,
  isInstructionStackOverBudget,
} from "./budget";

describe("instruction budget heuristics", () => {
  const agents = scoreRisk({ path: "AGENTS.md", bytes: 6_000, inactiveMs: 0 });
  const claude = scoreRisk({ path: "CLAUDE.md", bytes: 6_000, inactiveMs: 0 });

  it("sums instruction-path tokens for the stack budget", () => {
    const budget = computeInstructionBudget([agents, claude]);
    expect(budget.alwaysOnTokens).toBe(agents.estTokens + claude.estTokens);
    expect(budget.files.map((file) => file.path)).toEqual(["AGENTS.md", "CLAUDE.md"]);
  });

  it("emits kept semantic_bloat findings for repeated paragraphs", () => {
    const block =
      "Always run the full test suite before committing. Always write clear commit messages.";
    const repeated = Array.from({ length: 4 }, () => block).join("\n\n");
    const findings = buildInstructionHeuristicFindings({
      assessments: [agents],
      contentsByPath: new Map([["AGENTS.md", repeated]]),
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      path: "AGENTS.md",
      reason: "semantic_bloat",
      action: "kept",
      source: "heuristic",
    });
    expect(findings[0]?.detail).toContain("Repeated paragraph");
  });

  it("flags when stack exceeds recommended budget", () => {
    const budget = computeInstructionBudget([agents, claude]);
    expect(isInstructionStackOverBudget(budget)).toBe(
      budget.alwaysOnTokens > budget.recommendedMax,
    );
  });
});
