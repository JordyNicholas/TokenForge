import { describe, expect, it } from "vitest";
import type { EnrichmentCandidate, LlmStructuredFinding } from "../types";
import {
  buildJudgePrompt,
  buildMapPrompt,
  buildReconcilePrompt,
  formatRepoContextMap,
  isInstructionPath,
} from "./prompts";
import type { RepoContextMap } from "./types";

const candidates: EnrichmentCandidate[] = [
  {
    path: "AGENTS.md",
    bytes: 4200,
    estTokens: 1050,
    excerpt: "Always run lint before commit.".repeat(40),
  },
  {
    path: "src/app.ts",
    bytes: 800,
    estTokens: 200,
    excerpt: "export const app = true;",
  },
];

const map: RepoContextMap = {
  hubs: ["AGENTS.md"],
  clusters: [["AGENTS.md", "src/app.ts"]],
  batchHints: [["AGENTS.md", "src/app.ts"]],
  suspects: ["src/app.ts"],
};

describe("isInstructionPath", () => {
  it("detects instruction and rules paths", () => {
    expect(isInstructionPath("AGENTS.md")).toBe(true);
    expect(isInstructionPath(".cursor/rules/testing.mdc")).toBe(true);
    expect(isInstructionPath("src/app.ts")).toBe(false);
  });
});

describe("buildMapPrompt", () => {
  it("includes inventory and digests only for instruction paths", () => {
    const prompt = buildMapPrompt(candidates);
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("src/app.ts");
    expect(prompt).toContain("digest:");
    expect(prompt).toContain("Always run lint before commit.");
    expect(prompt).toContain("…(truncated)");
    expect(prompt).not.toContain("export const app = true;");
    expect(prompt).toContain("Do not suggest architecture");
    expect(prompt).toContain("never README, RULEBOOK");
  });
});

describe("buildJudgePrompt", () => {
  it("prepends the map when provided", () => {
    const withMap = buildJudgePrompt(candidates.slice(0, 1), map);
    expect(withMap).toContain("RepoContextMap");
    expect(withMap).toContain("AGENTS.md");
    expect(withMap).toContain("TokenForge will not apply");

    const withoutMap = buildJudgePrompt(candidates.slice(0, 1), null);
    expect(withoutMap).not.toContain("RepoContextMap");
  });
});

describe("buildReconcilePrompt", () => {
  it("includes map, finding rows, and protect-docs policy", () => {
    const findings: LlmStructuredFinding[] = [
      {
        path: "AGENTS.md",
        verdict: "exclude",
        reason: "redundant_instructions",
        detail: "Duplicates rules",
      },
    ];
    const prompt = buildReconcilePrompt(map, findings);
    expect(prompt).toContain(formatRepoContextMap(map));
    expect(prompt).toContain('"path":"AGENTS.md"');
    expect(prompt).not.toContain("Always run lint before commit.");
    expect(prompt).toContain("Drop findings that exclude documentation");
    expect(prompt).toContain("preserving repository functionality and documentation");
  });
});
