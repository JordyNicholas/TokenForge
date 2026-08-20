import { describe, expect, it, vi } from "vitest";
import type { EnrichmentCandidate } from "../types";
import { runMultiPassEnrich } from "./run";

const candidates: EnrichmentCandidate[] = [
  {
    path: "AGENTS.md",
    bytes: 4200,
    estTokens: 1050,
    excerpt: "Always run lint.",
  },
  {
    path: ".cursor/rules/testing.mdc",
    bytes: 2100,
    estTokens: 525,
    excerpt: "Run lint before commit.",
  },
];

describe("runMultiPassEnrich", () => {
  it("returns empty findings for empty candidates", async () => {
    const callModel = vi.fn();
    await expect(
      runMultiPassEnrich({
        candidates: [],
        callModel,
        batchSize: 2,
      }),
    ).resolves.toEqual([]);
    expect(callModel).not.toHaveBeenCalled();
  });

  it("runs map → judge → reconcile on the happy path", async () => {
    const callModel = vi.fn(async (prompt: string) => {
      if (prompt.includes("compact context map")) {
        return JSON.stringify({
          hubs: ["AGENTS.md"],
          clusters: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
          batchHints: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
        });
      }
      if (prompt.includes("reconcile TokenForge LLM findings")) {
        return JSON.stringify({
          findings: [
            {
              path: ".cursor/rules/testing.mdc",
              verdict: "exclude",
              reason: "redundant_instructions",
              confidence: 0.9,
              detail: "Duplicates AGENTS.md",
            },
          ],
        });
      }
      return JSON.stringify({
        findings: [
          {
            path: "AGENTS.md",
            verdict: "review",
            reason: "semantic_bloat",
            confidence: 0.5,
          },
          {
            path: ".cursor/rules/testing.mdc",
            verdict: "exclude",
            reason: "redundant_instructions",
            confidence: 0.8,
          },
        ],
      });
    });

    const findings = await runMultiPassEnrich({
      candidates,
      callModel,
      batchSize: 2,
    });

    expect(callModel).toHaveBeenCalledTimes(3);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      path: ".cursor/rules/testing.mdc",
      reason: "redundant_instructions",
      confidence: 0.95,
    });
  });

  it("falls back to flat Pass B when Pass A fails", async () => {
    const callModel = vi.fn(async (prompt: string) => {
      if (prompt.includes("compact context map")) {
        throw new Error("map failed");
      }
      return JSON.stringify({
        findings: [
          {
            path: "AGENTS.md",
            verdict: "exclude",
            reason: "semantic_bloat",
            confidence: 0.7,
          },
        ],
      });
    });

    const findings = await runMultiPassEnrich({
      candidates,
      callModel,
      batchSize: 2,
    });

    // Pass A + two flat batches (size 2 → still one batch of 2 here)
    expect(callModel.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("AGENTS.md");
  });
});
