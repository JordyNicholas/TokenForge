import { describe, expect, it } from "vitest";
import type { EnrichmentCandidate } from "./types";
import {
  buildEnrichmentPrompt,
  extractJsonPayload,
  parseStructuredFindings,
} from "./structured";

const candidates: EnrichmentCandidate[] = [
  {
    path: "AGENTS.md",
    bytes: 4200,
    estTokens: 1050,
    excerpt: "Always run lint before commit.",
  },
];

describe("buildEnrichmentPrompt", () => {
  it("includes path, excerpt, and protect-docs policy", () => {
    const prompt = buildEnrichmentPrompt(candidates);
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("Always run lint before commit.");
    expect(prompt).toContain("TokenForge will not apply");
    expect(prompt).toContain("Do not suggest architecture");
    expect(prompt).toContain("preserving repository functionality and documentation");
    expect(prompt).toContain("RULEBOOK");
    expect(prompt).toContain("never exclude");
  });
});

describe("extractJsonPayload", () => {
  it("parses raw JSON", () => {
    expect(extractJsonPayload('{"findings":[]}')).toEqual({ findings: [] });
  });

  it("parses fenced JSON", () => {
    expect(
      extractJsonPayload('Here:\n```json\n{"findings":[]}\n```'),
    ).toEqual({ findings: [] });
  });
});

describe("parseStructuredFindings", () => {
  it("keeps exclude rows with known paths", () => {
    const rows = parseStructuredFindings(
      {
        findings: [
          {
            path: "AGENTS.md",
            verdict: "exclude",
            reason: "redundant_instructions",
            confidence: 0.9,
            detail: "Duplicate guidance",
          },
        ],
      },
      candidates,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      path: "AGENTS.md",
      verdict: "exclude",
      reason: "redundant_instructions",
    });
  });

  it("keeps allowlisted suggestions and drops unknown kinds and snippets", () => {
    const rows = parseStructuredFindings(
      {
        findings: [
          {
            path: "AGENTS.md",
            verdict: "exclude",
            reason: "redundant_instructions",
            suggestion: {
              kind: "dedupe_rules",
              summary: "Drop duplicated lint bullets.",
              snippet: "--- a/AGENTS.md\n+++ b/AGENTS.md\n",
            },
          },
          {
            path: "AGENTS.md",
            verdict: "review",
            reason: "semantic_bloat",
            suggestion: { kind: "rewrite_architecture", summary: "Split the app." },
          },
        ],
      },
      candidates,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.suggestion).toEqual({
      kind: "dedupe_rules",
      summary: "Drop duplicated lint bullets.",
    });
    expect(rows[0]?.suggestion).not.toHaveProperty("snippet");
    expect(rows[1]?.suggestion).toBeUndefined();
  });

  it("drops unknown paths and keep verdicts", () => {
    const rows = parseStructuredFindings(
      {
        findings: [
          { path: "missing.md", verdict: "exclude", reason: "semantic_bloat" },
          { path: "AGENTS.md", verdict: "keep", reason: "semantic_bloat" },
        ],
      },
      candidates,
    );

    expect(rows).toHaveLength(0);
  });
});
