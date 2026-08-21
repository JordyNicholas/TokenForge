import { describe, expect, it } from "vitest";
import type { EnrichmentCandidate } from "../types";
import { chunkCandidates, groupCandidatesForJudge } from "./group";
import type { RepoContextMap } from "./types";

function candidate(path: string): EnrichmentCandidate {
  return { path, bytes: 100, estTokens: 25, excerpt: path };
}

const candidates = [
  candidate("AGENTS.md"),
  candidate(".cursor/rules/a.mdc"),
  candidate(".cursor/rules/b.mdc"),
  candidate("big.json"),
  candidate("other.ts"),
];

describe("chunkCandidates", () => {
  it("slices in order by batch size", () => {
    expect(chunkCandidates(candidates, 2).map((batch) => batch.map((item) => item.path))).toEqual([
      ["AGENTS.md", ".cursor/rules/a.mdc"],
      [".cursor/rules/b.mdc", "big.json"],
      ["other.ts"],
    ]);
  });
});

describe("groupCandidatesForJudge", () => {
  it("falls back to flat chunking without a map", () => {
    expect(groupCandidatesForJudge(candidates, null, 2)).toEqual(
      chunkCandidates(candidates, 2),
    );
  });

  it("keeps batchHints / clusters together before leftovers", () => {
    const map: RepoContextMap = {
      hubs: ["AGENTS.md"],
      clusters: [["AGENTS.md", ".cursor/rules/b.mdc"]],
      batchHints: [["AGENTS.md", ".cursor/rules/a.mdc"]],
    };

    const batches = groupCandidatesForJudge(candidates, map, 2).map((batch) =>
      batch.map((item) => item.path),
    );

    expect(batches[0]).toEqual(["AGENTS.md", ".cursor/rules/a.mdc"]);
    // cluster member already consumed by batchHints — singleton cluster skipped
    expect(batches.slice(1)).toEqual([
      [".cursor/rules/b.mdc", "big.json"],
      ["other.ts"],
    ]);
  });

  it("respects batch size when a hint group is larger", () => {
    const map: RepoContextMap = {
      hubs: [],
      clusters: [],
      batchHints: [
        ["AGENTS.md", ".cursor/rules/a.mdc", ".cursor/rules/b.mdc"],
      ],
    };

    const batches = groupCandidatesForJudge(candidates, map, 2).map((batch) =>
      batch.map((item) => item.path),
    );

    expect(batches[0]).toEqual(["AGENTS.md", ".cursor/rules/a.mdc"]);
    expect(batches[1]).toEqual([".cursor/rules/b.mdc"]);
  });
});
