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

  it("repairs Pass A after empty_signal then continues map-aware", async () => {
    const onProgress = vi.fn();
    let mapCalls = 0;
    const callModel = vi.fn(async (prompt: string) => {
      if (
        prompt.includes("compact context map") ||
        prompt.includes("Repair your previous RepoContextMap")
      ) {
        mapCalls += 1;
        if (mapCalls === 1) {
          return JSON.stringify({
            hubs: [],
            clusters: [],
            batchHints: [],
            suspects: [],
          });
        }
        return JSON.stringify({
          hubs: ["AGENTS.md"],
          clusters: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
          batchHints: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
          suspects: [],
        });
      }
      if (prompt.includes("reconcile TokenForge LLM findings")) {
        return JSON.stringify({ findings: [] });
      }
      return JSON.stringify({
        findings: [
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
      onProgress,
    });

    expect(mapCalls).toBe(2);
    expect(callModel).toHaveBeenCalledTimes(4); // map + repair + judge + reconcile
    expect(findings[0]?.path).toBe(".cursor/rules/testing.mdc");
    expect(
      onProgress.mock.calls.some(([message]) =>
        String(message).includes("empty_signal"),
      ),
    ).toBe(true);
    expect(
      onProgress.mock.calls.some(([message]) =>
        String(message).includes("Pass A repair succeeded"),
      ),
    ).toBe(true);
  });

  it("falls back to flat Pass B after repair exhaustion", async () => {
    const onProgress = vi.fn();
    const callModel = vi.fn(async (prompt: string) => {
      if (
        prompt.includes("compact context map") ||
        prompt.includes("Repair your previous RepoContextMap")
      ) {
        return JSON.stringify({ hubs: ["missing.md"] });
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
      onProgress,
    });

    // map + repair + one flat Pass B batch
    expect(callModel).toHaveBeenCalledTimes(3);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("AGENTS.md");
    expect(
      onProgress.mock.calls.some(([message]) =>
        String(message).includes("Pass C skipped"),
      ),
    ).toBe(true);
    expect(
      onProgress.mock.calls.some(([message]) =>
        String(message).includes("no_known_paths"),
      ),
    ).toBe(true);
  });

  it("falls back to flat Pass B when Pass A transport fails through repair", async () => {
    const callModel = vi.fn(async (prompt: string) => {
      if (
        prompt.includes("compact context map") ||
        prompt.includes("Repair your previous RepoContextMap")
      ) {
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

    // Pass A + repair + Pass B
    expect(callModel.mock.calls.length).toBe(3);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("AGENTS.md");
  });
});
