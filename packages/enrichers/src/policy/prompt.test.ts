import { describe, expect, it } from "vitest";
import { buildPolicySynthesisPrompt } from "./prompt";

describe("buildPolicySynthesisPrompt", () => {
  it("includes findings and byte budget", () => {
    const prompt = buildPolicySynthesisPrompt({
      title: "Copilot instructions (TokenForge)",
      maxBytes: 8192,
      instructionContents: new Map([["AGENTS.md", "Always be verbose."]]),
      report: {
        source: "cli",
        timestamp: "2026-09-01T00:00:00.000Z",
        repo: "demo",
        team: "demo",
        provider: "copilot",
        findings: [
          {
            path: "package-lock.json",
            reason: "high_risk_filetype",
            bytes: 100,
            estTokens: 25,
            action: "excluded",
          },
        ],
        totals: { beforeTokens: 100, afterTokens: 75, savedTokens: 25 },
      },
    });
    expect(prompt).toContain("8192");
    expect(prompt).toContain("package-lock.json");
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("complete, readable");
  });
});
