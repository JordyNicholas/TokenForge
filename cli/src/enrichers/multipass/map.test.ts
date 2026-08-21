import { describe, expect, it } from "vitest";
import type { EnrichmentCandidate } from "../types";
import { evaluateRepoContextMap, parseRepoContextMap } from "./map";

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
  {
    path: "package-lock.json",
    bytes: 900_000,
    estTokens: 225_000,
    excerpt: "{",
  },
];

describe("parseRepoContextMap", () => {
  it("parses a valid map and drops unknown paths", () => {
    const map = parseRepoContextMap(
      {
        hubs: ["AGENTS.md", "missing.md"],
        clusters: [
          ["AGENTS.md", ".cursor/rules/testing.mdc"],
          ["AGENTS.md"],
          ["nope.md", "also-missing.md"],
        ],
        batchHints: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
        suspects: ["package-lock.json", "ghost.txt"],
      },
      candidates,
    );

    expect(map).toEqual({
      hubs: ["AGENTS.md"],
      clusters: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
      batchHints: [["AGENTS.md", ".cursor/rules/testing.mdc"]],
      suspects: ["package-lock.json"],
    });
  });

  it("returns null for garbage or empty signal", () => {
    expect(parseRepoContextMap(null, candidates)).toBeNull();
    expect(parseRepoContextMap({ hubs: [] }, candidates)).toBeNull();
    expect(
      parseRepoContextMap({ hubs: ["missing.md"], clusters: [] }, candidates),
    ).toBeNull();
  });

  it("returns null when there are no candidates", () => {
    expect(parseRepoContextMap({ hubs: ["AGENTS.md"] }, [])).toBeNull();
  });
});

describe("evaluateRepoContextMap", () => {
  it("reports not_object", () => {
    expect(evaluateRepoContextMap(null, candidates)).toMatchObject({
      ok: false,
      reason: "not_object",
    });
  });

  it("reports empty_signal when arrays are empty", () => {
    expect(
      evaluateRepoContextMap(
        { hubs: [], clusters: [], batchHints: [], suspects: [] },
        candidates,
      ),
    ).toMatchObject({
      ok: false,
      reason: "empty_signal",
    });
  });

  it("reports no_known_paths when all paths are invented", () => {
    expect(
      evaluateRepoContextMap(
        { hubs: ["missing.md"], clusters: [["a", "b"]], batchHints: [] },
        candidates,
      ),
    ).toMatchObject({
      ok: false,
      reason: "no_known_paths",
    });
  });

  it("reports no_candidates", () => {
    expect(
      evaluateRepoContextMap({ hubs: ["AGENTS.md"] }, []),
    ).toMatchObject({
      ok: false,
      reason: "no_candidates",
    });
  });
});
