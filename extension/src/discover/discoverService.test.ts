import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { buildDiscoverRankPrompt, discoverRecentChanges } from "./discoverService";
import { parseExclusionYaml } from "./parseExclusionYaml";
import { monorepoScopeHint } from "./monorepoHints";

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string) => {
        if (key === "llmEnrichment") {
          return false;
        }
        return undefined;
      },
    }),
  },
}));

const tmpRoots: string[] = [];

async function makeRoot(name: string): Promise<string> {
  const root = join("/tmp", `tf-discover-${name}-${Date.now()}`);
  await mkdir(root, { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tmpRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function report(findings: TokenRiskReport["findings"]): TokenRiskReport {
  return {
    source: "extension",
    timestamp: "2026-01-01T00:00:00.000Z",
    repo: "demo",
    team: "local",
    provider: "copilot",
    findings,
    totals: { beforeTokens: 100, afterTokens: 100, savedTokens: 0 },
  };
}

describe("parseExclusionYaml", () => {
  it("reads path entries", () => {
    expect(parseExclusionYaml("paths:\n  - dist/**\n  - lock.json\n")).toEqual([
      "dist/**",
      "lock.json",
    ]);
  });
});

describe("discoverRecentChanges", () => {
  it("surfaces policy gaps from a scan report when exclusions are empty", async () => {
    const root = await makeRoot("gap");
    const candidates = await discoverRecentChanges(root, {
      report: report([
        {
          path: "package-lock.json",
          reason: "high_risk_filetype",
          bytes: 4_000,
          estTokens: 1_000,
          action: "excluded",
          source: "heuristic",
        },
      ]),
      provider: "copilot",
      sinceMs: 1,
      writeReport: false,
      enrichmentEnabled: false,
    });
    expect(candidates.some((c) => c.kind === "policy_gap" && c.path === "package-lock.json")).toBe(
      true,
    );
  });

  it("ranks session_kept above a stub LLM when enrichment is on", async () => {
    const root = await makeRoot("llm");
    const candidates = await discoverRecentChanges(root, {
      report: report([
        {
          path: "src/app.ts",
          reason: "inactive_tab",
          bytes: 400,
          estTokens: 100,
          action: "kept",
          source: "heuristic",
        },
        {
          path: "package-lock.json",
          reason: "high_risk_filetype",
          bytes: 4_000,
          estTokens: 8_000,
          action: "excluded",
          source: "heuristic",
        },
      ]),
      provider: "copilot",
      sinceMs: 1,
      writeReport: false,
      enrichmentEnabled: true,
      judge: async () => ({ rankedPaths: ["src/app.ts", "package-lock.json"] }),
    });
    expect(candidates[0]?.path).toBe("src/app.ts");
  });
});

describe("monorepoScopeHint", () => {
  it("scopes to the package that owns the editor path", () => {
    const fixture = join(
      process.cwd().includes("extension")
        ? join(process.cwd(), "../fixtures/monorepo-config-app")
        : join(process.cwd(), "fixtures/monorepo-config-app"),
    );
    const hint = monorepoScopeHint(fixture, "packages/a/src/index.ts");
    expect(hint?.packageRoot).toBe("packages/a");
  });
});

describe("buildDiscoverRankPrompt", () => {
  it("asks the model to prefer missed savings over mtime", () => {
    const prompt = buildDiscoverRankPrompt([
      { path: "package-lock.json", delta: "changed", score: 90, kind: "policy_gap" },
    ]);
    expect(prompt).toContain("policy_gap");
    expect(prompt).not.toContain("function ");
  });
});
