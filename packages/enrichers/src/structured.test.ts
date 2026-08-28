import { describe, expect, it } from "vitest";
import type { EnrichmentCandidate } from "./types";
import { MAX_LLM_EXCERPT_CHARS } from "./limits";
import {
  buildEnrichmentPrompt,
  LARGE_CONTEXT_PROMPT,
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
  const sourceCandidates: EnrichmentCandidate[] = [
    {
      path: "src/utils/checkEmailFormat.js",
      bytes: 395,
      estTokens: 99,
      excerpt: "export function checkEmailFormat(input) {}",
    },
  ];

  it("keeps duplicate_logic rows", () => {
    const rows = parseStructuredFindings(
      {
        findings: [
          {
            path: "src/utils/checkEmailFormat.js",
            verdict: "review",
            reason: "duplicate_logic",
            confidence: 0.8,
            detail: "Same behavior as src/validators/isValidEmail.js",
          },
        ],
      },
      sourceCandidates,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reason: "duplicate_logic",
      verdict: "review",
    });
  });

  it("coerces a duplicate_logic exclude verdict down to review", () => {
    // Both copies are still imported, so excluding one fixes nothing —
    // a model that ignores the prompt rule must not be trusted.
    const rows = parseStructuredFindings(
      {
        findings: [
          {
            path: "src/utils/checkEmailFormat.js",
            verdict: "exclude",
            reason: "duplicate_logic",
            confidence: 0.9,
          },
        ],
      },
      sourceCandidates,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.verdict).toBe("review");
  });

  describe("redundant_config (#136)", () => {
    const configCandidates = [
      {
        path: "packages/a/tsconfig.json",
        bytes: 300,
        estTokens: 75,
        excerpt: '{"compilerOptions":{"strict":true}}',
      },
      {
        path: "packages/b/tsconfig.json",
        bytes: 310,
        estTokens: 78,
        excerpt: '{"compilerOptions":{"strict":true}}',
      },
    ];

    it("accepts the reason", () => {
      const rows = parseStructuredFindings(
        {
          findings: [
            {
              path: "packages/b/tsconfig.json",
              verdict: "review",
              reason: "redundant_config",
              confidence: 0.8,
              detail: "Repeats packages/a/tsconfig.json.",
            },
          ],
        },
        configCandidates,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        reason: "redundant_config",
        verdict: "review",
      });
    });

    it("coerces an exclude verdict down to review", () => {
      // Every package still loads its own copy at build time, so excluding
      // one from agent context fixes nothing.
      const rows = parseStructuredFindings(
        {
          findings: [
            {
              path: "packages/b/tsconfig.json",
              verdict: "exclude",
              reason: "redundant_config",
              confidence: 0.9,
            },
          ],
        },
        configCandidates,
      );

      expect(rows[0]?.verdict).toBe("review");
    });

    it("pins the suggestion kind to dedupe_rules but keeps the model's summary", () => {
      const rows = parseStructuredFindings(
        {
          findings: [
            {
              path: "packages/b/tsconfig.json",
              verdict: "review",
              reason: "redundant_config",
              suggestion: {
                kind: "exclude_from_context",
                summary: "Extend packages/tsconfig.base.json instead.",
              },
            },
          ],
        },
        configCandidates,
      );

      expect(rows[0]?.suggestion).toEqual({
        kind: "dedupe_rules",
        summary: "Extend packages/tsconfig.base.json instead.",
      });
    });
  });

  it("coerces duplicate_logic suggestion kind to consolidate_duplicates", () => {
    const rows = parseStructuredFindings(
      {
        findings: [
          {
            path: "src/utils/checkEmailFormat.js",
            verdict: "review",
            reason: "duplicate_logic",
            confidence: 0.8,
            suggestion: {
              kind: "review",
              summary: "Merge with src/validators/isValidEmail.js.",
            },
          },
        ],
      },
      sourceCandidates,
    );

    expect(rows[0]?.suggestion).toEqual({
      kind: "consolidate_duplicates",
      summary: "Merge with src/validators/isValidEmail.js.",
    });
  });

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

  it("soft-caps confidence below absolute certainty", () => {
    const rows = parseStructuredFindings(
      {
        findings: [
          {
            path: "AGENTS.md",
            verdict: "exclude",
            reason: "semantic_bloat",
            confidence: 1,
          },
        ],
      },
      candidates,
    );

    expect(rows[0]?.confidence).toBe(0.95);
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

describe("excerpt budget is per-backend", () => {
  const long = (chars: number) => ({
    path: "AGENTS.md",
    bytes: chars,
    estTokens: Math.ceil(chars / 4),
    excerpt: "A".repeat(chars),
  });

  it("defaults to the local-model trim when no budget is given", () => {
    // Omitting the option must keep the Ollama path byte-identical.
    const prompt = buildEnrichmentPrompt([long(10_000)]);
    expect(prompt).toContain("…(truncated)");
    expect(prompt).toContain("A".repeat(MAX_LLM_EXCERPT_CHARS));
    expect(prompt).not.toContain("A".repeat(MAX_LLM_EXCERPT_CHARS + 1));
  });

  it("does not trim at all for a large-context backend", () => {
    // The frontier backends were seeing the first 2 KiB of every file
    // regardless of their context window; MAX_CANDIDATE_BYTES still bounds
    // what was read from disk in the first place.
    const prompt = buildEnrichmentPrompt([long(10_000)], LARGE_CONTEXT_PROMPT);
    expect(prompt).not.toContain("…(truncated)");
    expect(prompt).toContain("A".repeat(10_000));
  });

  it("honours an explicit budget between the two", () => {
    const prompt = buildEnrichmentPrompt([long(10_000)], { excerptChars: 500 });
    expect(prompt).toContain("…(truncated)");
    expect(prompt).not.toContain("A".repeat(501));
  });
});
