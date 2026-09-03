import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrackedTab } from "../tabs/types";
import {
  buildOverlapPrompt,
  clearOverlapRadarCache,
  detectInstructionOverlap,
  resolveInstructionOverlap,
} from "./overlapRadar";

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string) => {
        if (key === "llmEnrichment") {
          return true;
        }
        if (key === "llm") {
          return "ollama:qwen2.5-coder:3b";
        }
        return undefined;
      },
    }),
  },
}));

function tab(path: string): TrackedTab {
  return {
    uri: `file:///${path}`,
    path,
    bytes: 100,
    lastActivityAt: Date.now(),
    lastFocusAt: Date.now(),
    lastEditAt: Date.now(),
    assessment: {
      path,
      bytes: 100,
      estTokens: 25,
      fileClass: "unknown",
      score: 0,
      atRisk: false,
      reasons: [],
    },
  };
}

describe("overlapRadar", () => {
  afterEach(() => {
    clearOverlapRadarCache();
  });

  it("heuristic flags shared basename, not semantic wording", () => {
    const hints = detectInstructionOverlap(
      [tab("packages/api/AGENTS.md")],
      ["AGENTS.md", "packages/api/AGENTS.md"],
    );
    expect(hints.some((h) => h.path === "AGENTS.md")).toBe(true);
    expect(hints.every((h) => h.source === "heuristic")).toBe(true);
  });

  it("LLM pass reports restated rules, not basename-only pairs", async () => {
    const root = join(tmpdir(), `tf-overlap-${Date.now()}`);
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, "AGENTS.md"),
      "Never load test fixtures into agent context.\n",
      "utf8",
    );
    await mkdir(join(root, ".cursor", "rules"), { recursive: true });
    await writeFile(
      join(root, ".cursor", "rules", "testing.mdc"),
      "Skip tests and fixtures when gathering context.\n",
      "utf8",
    );

    const hints = await resolveInstructionOverlap({
      root,
      tabs: [],
      instructionPaths: ["AGENTS.md", ".cursor/rules/testing.mdc"],
      enrichmentEnabled: true,
      judge: async () => ({
        overlaps: [
          {
            path: "AGENTS.md",
            overlapsWith: ".cursor/rules/testing.mdc",
            note: "Both tell the agent to ignore tests.",
          },
        ],
      }),
    });

    expect(hints).toHaveLength(1);
    expect(hints[0]?.source).toBe("llm");
    expect(hints[0]?.note).toMatch(/ignore tests/i);
  });

  it("does not treat basename-only as semantic overlap when enrichment is on", async () => {
    const root = join(tmpdir(), `tf-overlap-base-${Date.now()}`);
    await mkdir(root, { recursive: true });
    await mkdir(join(root, "a"), { recursive: true });
    await mkdir(join(root, "b"), { recursive: true });
    await writeFile(join(root, "a", "AGENTS.md"), "Prefer small PRs.\n", "utf8");
    await writeFile(join(root, "b", "AGENTS.md"), "Use conventional commits.\n", "utf8");

    const hints = await resolveInstructionOverlap({
      root,
      tabs: [tab("a/AGENTS.md"), tab("b/AGENTS.md")],
      instructionPaths: ["a/AGENTS.md", "b/AGENTS.md"],
      enrichmentEnabled: true,
      judge: async () => ({ overlaps: [] }),
    });

    expect(hints).toEqual([]);
  });

  it("falls back to basename heuristic when enrichment is off", async () => {
    const judge = vi.fn();
    const hints = await resolveInstructionOverlap({
      root: "/unused",
      tabs: [tab("dup/AGENTS.md")],
      instructionPaths: ["AGENTS.md", "dup/AGENTS.md"],
      enrichmentEnabled: false,
      judge,
    });
    expect(judge).not.toHaveBeenCalled();
    expect(hints[0]?.source).toBe("heuristic");
  });

  it("falls back to heuristic when the judge throws", async () => {
    const root = join(tmpdir(), `tf-overlap-fail-${Date.now()}`);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "AGENTS.md"), "Keep PRs small.\n", "utf8");
    await mkdir(join(root, "dup"), { recursive: true });
    await writeFile(join(root, "dup", "AGENTS.md"), "Keep PRs small.\n", "utf8");

    const hints = await resolveInstructionOverlap({
      root,
      tabs: [tab("dup/AGENTS.md")],
      instructionPaths: ["AGENTS.md", "dup/AGENTS.md"],
      enrichmentEnabled: true,
      judge: async () => {
        throw new Error("ollama down");
      },
    });
    expect(hints[0]?.source).toBe("heuristic");
  });

  it("prompt asks for semantic overlap, not basename matching", () => {
    const prompt = buildOverlapPrompt([
      { path: "AGENTS.md", excerpt: "Ignore tests." },
      { path: "CLAUDE.md", excerpt: "Do not load tests." },
    ]);
    expect(prompt).toContain("SEMANTIC overlap");
    expect(prompt).toContain("Do NOT report overlap only because two files share a basename");
  });
});
