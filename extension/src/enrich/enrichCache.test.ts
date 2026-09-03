import { describe, expect, it } from "vitest";
import type { TokenRiskFinding } from "@tokenforge/risk-core";
import {
  bucketFindingsByPath,
  emptyCache,
  hashContent,
  partitionByCache,
} from "./enrichCache";

function finding(path: string): TokenRiskFinding {
  return { path, reason: "semantic_bloat", bytes: 10, estTokens: 3, action: "excluded", source: "llm" };
}

describe("hashContent", () => {
  it("is stable for identical content and differs when content changes", () => {
    expect(hashContent("hello")).toBe(hashContent("hello"));
    expect(hashContent("hello")).not.toBe(hashContent("hello!"));
  });
});

describe("partitionByCache", () => {
  it("marks unchanged files as hits and changed/new files as stale", () => {
    const cache = emptyCache("ollama", "qwen2.5-coder:3b");
    cache.entries["AGENTS.md"] = { hash: hashContent("a"), findings: [finding("AGENTS.md")] };
    cache.entries["CLAUDE.md"] = { hash: hashContent("old"), findings: [] };

    const { hits, stale } = partitionByCache(
      [
        { path: "AGENTS.md", hash: hashContent("a") }, // unchanged → hit
        { path: "CLAUDE.md", hash: hashContent("new") }, // changed → stale
        { path: ".cursorrules", hash: hashContent("x") }, // new → stale
      ],
      cache,
    );

    expect(hits).toEqual(["AGENTS.md"]);
    expect(stale).toEqual(["CLAUDE.md", ".cursorrules"]);
  });

  it("treats everything as stale against an empty cache", () => {
    const { hits, stale } = partitionByCache(
      [{ path: "AGENTS.md", hash: "h" }],
      emptyCache("ollama", "qwen2.5-coder:3b"),
    );
    expect(hits).toEqual([]);
    expect(stale).toEqual(["AGENTS.md"]);
  });
});

describe("bucketFindingsByPath", () => {
  it("groups findings by their path", () => {
    const map = bucketFindingsByPath([finding("a"), finding("a"), finding("b")]);
    expect(map.get("a")).toHaveLength(2);
    expect(map.get("b")).toHaveLength(1);
    expect(map.get("c")).toBeUndefined();
  });
});
