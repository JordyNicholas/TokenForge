import { describe, expect, it } from "vitest";
import type { EnrichmentCandidate, LlmStructuredFinding } from "../types";
import {
  buildJudgePrompt,
  buildMapPrompt,
  buildMapRepairPrompt,
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
  {
    path: "config/locales.json",
    bytes: 900,
    estTokens: 225,
    excerpt: '{"hello":"world"}',
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
    expect(isInstructionPath("rules/pricing-notes.md")).toBe(false);
  });
});

describe("buildMapPrompt", () => {
  it("digests instruction and source paths, but not other classes", () => {
    const prompt = buildMapPrompt(candidates);
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("src/app.ts");
    expect(prompt).toContain("digest:");
    expect(prompt).toContain("Always run lint before commit.");
    expect(prompt).toContain("…(truncated)");
    // Source files need a digest too: without content, Pass A sees only a path
    // and a byte count and cannot cluster them by meaning.
    expect(prompt).toContain("export const app = true;");
    // Still scoped — a config file is listed but not digested.
    expect(prompt).toContain("config/locales.json");
    expect(prompt).not.toContain('{"hello":"world"}');
    expect(prompt).toContain("Do not suggest architecture");
    expect(prompt).toContain("never README, RULEBOOK");
    expect(prompt).toContain("all four keys required");
    expect(prompt).toContain("Example using paths from THIS inventory");
    expect(prompt).toContain('"hubs":["AGENTS.md"]');
  });
});

describe("buildMapPrompt — repeated per-package configs (#136)", () => {
  const monorepo: EnrichmentCandidate[] = [
    {
      path: "packages/a/tsconfig.json",
      bytes: 300,
      estTokens: 75,
      excerpt: '{"compilerOptions":{"strict":true,"target":"ES2022"}}',
    },
    {
      path: "packages/b/tsconfig.json",
      bytes: 310,
      estTokens: 78,
      excerpt: '{"compilerOptions":{"target":"ES2022","strict":true}}',
    },
    {
      path: "config/locales.json",
      bytes: 900,
      estTokens: 225,
      excerpt: '{"hello":"world"}',
    },
  ];

  it("digests a config whose basename repeats across packages", () => {
    const prompt = buildMapPrompt(monorepo);

    // Without content, Pass A sees two paths with similar names and cannot
    // tell whether the settings actually repeat.
    expect(prompt).toContain('{"compilerOptions":{"strict":true,"target":"ES2022"}}');
    expect(prompt).toContain('{"compilerOptions":{"target":"ES2022","strict":true}}');
  });

  it("still withholds a digest from a config that appears only once", () => {
    const prompt = buildMapPrompt(monorepo);

    expect(prompt).toContain("config/locales.json");
    expect(prompt).not.toContain('{"hello":"world"}');
  });

  it("withholds the digest when the sibling copy is not in this inventory", () => {
    // The set is computed per inventory: with nothing to compare against,
    // digesting the file would spend prompt budget for no possible finding.
    const lonely = buildMapPrompt([monorepo[0], monorepo[2]]);

    expect(lonely).toContain("packages/a/tsconfig.json");
    expect(lonely).not.toContain('"compilerOptions"');
  });
});

describe("buildMapRepairPrompt", () => {
  it("includes validation detail and previous output", () => {
    const prompt = buildMapRepairPrompt(
      candidates,
      '{"hubs":[]}',
      "empty_signal: Pass A JSON had no usable hubs",
    );
    expect(prompt).toContain("Repair your previous RepoContextMap");
    expect(prompt).toContain("empty_signal");
    expect(prompt).toContain('{"hubs":[]}');
    expect(prompt).toContain("AGENTS.md");
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
    expect(prompt).toContain("analysisOverview");
  });
});
