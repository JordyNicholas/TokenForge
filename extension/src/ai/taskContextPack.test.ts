import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RiskAssessment } from "@tokenforge/risk-core";
import type { ShieldSession } from "../session/shieldSession";
import type { TrackedTab } from "../tabs/types";
import {
  buildHeuristicTaskContextPack,
  buildTabRankPrompt,
  buildTaskContextPack,
  clearTaskContextPackCache,
  collectTabRankSignals,
} from "./taskContextPack";

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

function assessment(
  path: string,
  estTokens: number,
  fileClass: RiskAssessment["fileClass"],
  reasons: RiskAssessment["reasons"] = [],
): RiskAssessment {
  return {
    path,
    bytes: estTokens * 4,
    estTokens,
    fileClass,
    score: estTokens,
    atRisk: true,
    reasons,
  };
}

function tab(
  path: string,
  estTokens: number,
  fileClass: RiskAssessment["fileClass"],
  reasons: RiskAssessment["reasons"] = [],
): TrackedTab {
  const uri = `file:///${path}`;
  return {
    uri,
    path,
    bytes: estTokens * 4,
    lastActivityAt: Date.now(),
    lastFocusAt: Date.now(),
    lastEditAt: Date.now(),
    assessment: assessment(path, estTokens, fileClass, reasons),
  };
}

function fakeSession(tabs: TrackedTab[], activePath?: string): ShieldSession {
  const activeUri = tabs.find((t) => t.path === activePath)?.uri;
  return {
    listDisplayAtRisk: () => tabs,
    registry: { getActiveUri: () => activeUri },
  } as unknown as ShieldSession;
}

describe("taskContextPack", () => {
  beforeEach(() => {
    clearTaskContextPackCache();
  });

  it("heuristic packs largest token tabs first", () => {
    const session = fakeSession([
      tab("package-lock.json", 50_000, "lockfile"),
      tab("src/app.ts", 200, "source"),
    ]);
    const pack = buildHeuristicTaskContextPack(session);
    expect(pack.paths[0]).toBe("package-lock.json");
    expect(pack.source).toBe("heuristic");
  });

  it("LLM rank prefers focused source over a noisy lockfile", async () => {
    const session = fakeSession(
      [
        tab("package-lock.json", 50_000, "lockfile"),
        tab("src/app.ts", 200, "source"),
      ],
      "src/app.ts",
    );

    const pack = await buildTaskContextPack(session, {
      enrichmentEnabled: true,
      judge: async () => ({
        rankedPaths: ["src/app.ts", "package-lock.json"],
        note: "Focused source first.",
      }),
    });

    expect(pack.paths[0]).toBe("src/app.ts");
    expect(pack.source).toBe("llm");
    expect(pack.note).toContain("Focused source");
  });

  it("falls back to heuristic when enrichment is off", async () => {
    const session = fakeSession([
      tab("package-lock.json", 50_000, "lockfile"),
      tab("src/app.ts", 200, "source"),
    ]);
    const judge = vi.fn();
    const pack = await buildTaskContextPack(session, {
      enrichmentEnabled: false,
      judge,
    });
    expect(judge).not.toHaveBeenCalled();
    expect(pack.paths[0]).toBe("package-lock.json");
    expect(pack.source).toBe("heuristic");
  });

  it("falls back to heuristic when the judge throws", async () => {
    const session = fakeSession([
      tab("package-lock.json", 50_000, "lockfile"),
      tab("src/app.ts", 200, "source"),
    ]);
    const pack = await buildTaskContextPack(session, {
      enrichmentEnabled: true,
      judge: async () => {
        throw new Error("ollama down");
      },
    });
    expect(pack.source).toBe("heuristic");
    expect(pack.paths[0]).toBe("package-lock.json");
  });

  it("ignores ranked paths that were not in the open-tab set", async () => {
    const session = fakeSession([tab("src/app.ts", 200, "source")]);
    const pack = await buildTaskContextPack(session, {
      enrichmentEnabled: true,
      judge: async () => ({ rankedPaths: ["secret.env", "src/app.ts"] }),
    });
    expect(pack.paths).toEqual(["src/app.ts"]);
  });

  it("builds a metadata-only rank prompt", () => {
    const prompt = buildTabRankPrompt([
      {
        path: "src/app.ts",
        fileClass: "source",
        estTokens: 200,
        focused: true,
        idle: false,
        reasons: [],
      },
    ]);
    expect(prompt).toContain("Do NOT read file bodies");
    expect(prompt).toContain("path=src/app.ts");
    expect(prompt).not.toContain("function ");
  });

  it("collects focused + idle signals", () => {
    const session = fakeSession(
      [
        tab("src/app.ts", 200, "source"),
        tab("dump.json", 9_000, "config", ["inactive_tab"]),
      ],
      "src/app.ts",
    );
    const signals = collectTabRankSignals(session);
    expect(signals.find((s) => s.path === "src/app.ts")?.focused).toBe(true);
    expect(signals.find((s) => s.path === "dump.json")?.idle).toBe(true);
  });
});
