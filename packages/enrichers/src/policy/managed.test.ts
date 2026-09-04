import { describe, expect, it } from "vitest";
import { synthesizeManagedPolicy } from "./managed";
import { createPolicyPromptRunner, policyBackendRequiresExternalConsent } from "./runners";

describe("createPolicyPromptRunner", () => {
  it("returns runners for major hybrid Fix backends", () => {
    expect(createPolicyPromptRunner("ollama")).toBeTypeOf("function");
    expect(createPolicyPromptRunner("anthropic")).toBeTypeOf("function");
    expect(createPolicyPromptRunner("cursor-cli")).toBeTypeOf("function");
    expect(createPolicyPromptRunner("gemini-cli")).toBeTypeOf("function");
    expect(createPolicyPromptRunner("claude-code")).toBeTypeOf("function");
    expect(createPolicyPromptRunner("codex")).toBeTypeOf("function");
    expect(createPolicyPromptRunner("noop")).toBeUndefined();
  });

  it("flags vendor backends as requiring external consent", () => {
    expect(policyBackendRequiresExternalConsent("ollama")).toBe(false);
    expect(policyBackendRequiresExternalConsent("gemini-cli")).toBe(true);
    expect(policyBackendRequiresExternalConsent("cursor-cli")).toBe(true);
  });
});

describe("synthesizeManagedPolicy", () => {
  it("uses heuristic synthesis when mode is heuristic", async () => {
    const result = await synthesizeManagedPolicy({
      root: process.cwd(),
      title: "TokenForge instructions (generic)",
      applyMode: "heuristic",
      instructionContents: new Map(),
      report: {
        source: "cli",
        timestamp: "2026-09-01T00:00:00.000Z",
        repo: "demo",
        team: "demo",
        provider: "generic",
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
    expect(result.backend).toBe("heuristic");
    expect(result.markdown).toContain("# TokenForge instructions (generic)");
  });

  it("falls back to heuristic for hybrid noop", async () => {
    const result = await synthesizeManagedPolicy({
      root: process.cwd(),
      title: "TokenForge instructions (generic)",
      applyMode: "hybrid",
      llm: undefined,
      instructionContents: new Map(),
      report: {
        source: "cli",
        timestamp: "2026-09-01T00:00:00.000Z",
        repo: "demo",
        team: "demo",
        provider: "generic",
        findings: [],
        totals: { beforeTokens: 0, afterTokens: 0, savedTokens: 0 },
      },
    });
    expect(result.backend).toBe("heuristic");
  });
});
