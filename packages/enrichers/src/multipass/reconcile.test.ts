import { describe, expect, it } from "vitest";
import type { LlmStructuredFinding } from "../types";
import { reconcileFindings, relatedPathsInMap } from "./reconcile";
import type { RepoContextMap } from "./types";

const map: RepoContextMap = {
  hubs: ["AGENTS.md"],
  clusters: [
    ["AGENTS.md", ".cursor/rules/testing.mdc"],
    ["src/utils/checkEmailFormat.js", "src/validators/isValidEmail.js"],
  ],
  batchHints: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
};

describe("relatedPathsInMap", () => {
  it("returns siblings from clusters and batchHints", () => {
    expect([...relatedPathsInMap(map, "AGENTS.md")]).toEqual([
      ".cursor/rules/testing.mdc",
    ]);
  });
});

describe("reconcileFindings", () => {
  it("dedupes by path keeping higher confidence", () => {
    const findings: LlmStructuredFinding[] = [
      {
        path: "AGENTS.md",
        verdict: "review",
        reason: "semantic_bloat",
        confidence: 0.4,
      },
      {
        path: "AGENTS.md",
        verdict: "exclude",
        reason: "semantic_bloat",
        confidence: 0.9,
      },
    ];

    expect(reconcileFindings(null, findings)).toEqual([findings[1]]);
  });

  it("strengthens map-supported redundant_instructions", () => {
    const findings: LlmStructuredFinding[] = [
      {
        path: "AGENTS.md",
        verdict: "exclude",
        reason: "redundant_instructions",
        confidence: 0.8,
      },
    ];

    expect(reconcileFindings(map, findings)[0]).toMatchObject({
      reason: "redundant_instructions",
      confidence: 0.85,
    });
  });

  it("downgrades unsupported redundant_instructions", () => {
    const findings: LlmStructuredFinding[] = [
      {
        path: "lonely.md",
        verdict: "exclude",
        reason: "redundant_instructions",
        confidence: 0.9,
        detail: "Claims a duplicate elsewhere",
      },
    ];

    expect(reconcileFindings(map, findings)[0]).toMatchObject({
      path: "lonely.md",
      reason: "semantic_bloat",
      detail: "Claims a duplicate elsewhere",
    });
  });

  it("strengthens map-supported duplicate_logic", () => {
    const findings: LlmStructuredFinding[] = [
      {
        path: "src/utils/checkEmailFormat.js",
        verdict: "review",
        reason: "duplicate_logic",
        confidence: 0.8,
      },
    ];

    expect(reconcileFindings(map, findings)[0]).toMatchObject({
      reason: "duplicate_logic",
      confidence: 0.85,
    });
  });

  it("weakens an uncorroborated duplicate_logic without relabelling it", () => {
    // Must NOT become semantic_bloat: that asserts something different about
    // application code, and it is the label that invites exclusion.
    const findings: LlmStructuredFinding[] = [
      {
        path: "src/lonely-helper.js",
        verdict: "review",
        reason: "duplicate_logic",
        confidence: 0.9,
      },
    ];

    expect(reconcileFindings(map, findings)[0]).toMatchObject({
      path: "src/lonely-helper.js",
      reason: "duplicate_logic",
      verdict: "review",
      confidence: 0.75,
    });
  });
});
