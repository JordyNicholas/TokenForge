import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenRiskFinding } from "@tokenforge/risk-core";
import { emptyCache, hashContent } from "./enrichCache";

const get = vi.fn();

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get }) },
}));

const enrich = vi.fn(async (_input: { model: string; externalDataConsent?: boolean }) => ({
  findings: [] as TokenRiskFinding[],
  meta: {
    backend: "claude-code" as const,
    model: "default",
    durationMs: 1,
    candidatesSent: 1,
  },
}));

vi.mock("@tokenforge/enrichers", async () => {
  const actual =
    await vi.importActual<typeof import("@tokenforge/enrichers")>(
      "@tokenforge/enrichers",
    );
  return { ...actual, getEnricher: () => ({ id: "claude-code", enrich }) };
});

const loadEnrichCache = vi.fn<
  (
    root: string,
    backend: string,
    model: string,
  ) => Promise<ReturnType<typeof emptyCache>>
>();
const saveEnrichCache = vi.fn<
  (root: string, cache: ReturnType<typeof emptyCache>) => Promise<void>
>(async () => {});

vi.mock("./enrichCache", async () => {
  const actual = await vi.importActual<typeof import("./enrichCache")>("./enrichCache");
  return {
    ...actual,
    loadEnrichCache: (
      root: string,
      backend: string,
      model: string,
    ) => loadEnrichCache(root, backend, model),
    saveEnrichCache: (root: string, cache: ReturnType<typeof emptyCache>) =>
      saveEnrichCache(root, cache),
  };
});

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.from("agents body", "utf8")),
}));

const CANDIDATE = {
  path: "AGENTS.md",
  bytes: 10,
  estTokens: 3,
  fileClass: "source" as const,
  score: 0,
  atRisk: false,
  reasons: [],
};

/** Settings the extension reads, keyed the way readLlmSettings looks them up. */
function configure(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    llmEnrichment: true,
    llm: "claude-code",
    allowExternalLlm: false,
    ...overrides,
  };
  get.mockImplementation((key: string) => values[key]);
}

async function run(options: Record<string, unknown> = {}) {
  const { runInstructionEnrichment } = await import("./runInstructionEnrichment");
  return runInstructionEnrichment({
    root: process.cwd(),
    candidates: [CANDIDATE],
    ...options,
  } as Parameters<typeof runInstructionEnrichment>[0]);
}

describe("runInstructionEnrichment with claude-code", () => {
  beforeEach(() => {
    vi.resetModules();
    get.mockReset();
    enrich.mockClear();
    loadEnrichCache.mockReset();
    saveEnrichCache.mockClear();
    loadEnrichCache.mockResolvedValue(emptyCache("claude-code", "default"));
  });

  it("refuses to run until allowExternalLlm is enabled", async () => {
    configure();

    await expect(run()).rejects.toThrow(
      'Backend "claude-code" sends excerpts off this machine',
    );
    expect(enrich).not.toHaveBeenCalled();
  });

  it("runs once the workspace has opted in", async () => {
    configure({ allowExternalLlm: true });

    const outcome = await run();

    expect(enrich).toHaveBeenCalledOnce();
    expect(outcome.fullCacheHit).toBe(false);
    // The adapter enforces its own gate too, so the opt-in has to reach it —
    // an extension that only checked locally would trip the CLI's UsageError.
    expect(enrich.mock.calls[0]![0]).toMatchObject({
      model: "default",
      externalDataConsent: true,
    });
  });

  it("still respects the master enrichment switch", async () => {
    configure({ llmEnrichment: false, allowExternalLlm: true });

    await expect(run()).rejects.toThrow("LLM enrichment is off");
    expect(enrich).not.toHaveBeenCalled();
  });

  it("serves a full cache hit without calling the model", async () => {
    configure({ allowExternalLlm: true });
    const cached: TokenRiskFinding = {
      path: "AGENTS.md",
      reason: "semantic_bloat",
      bytes: 10,
      estTokens: 3,
      action: "excluded",
      source: "llm",
    };
    const cache = emptyCache("claude-code", "default");
    cache.entries["AGENTS.md"] = {
      hash: hashContent("agents body"),
      findings: [cached],
    };
    loadEnrichCache.mockResolvedValue(cache);

    const outcome = await run();

    expect(enrich).not.toHaveBeenCalled();
    expect(outcome.fullCacheHit).toBe(true);
    expect(outcome.cacheHitCount).toBe(1);
    expect(outcome.meta.candidatesSent).toBe(0);
    expect(outcome.findings).toEqual([cached]);
    expect(saveEnrichCache).not.toHaveBeenCalled();
  });

  it("bypassCache forces a model call even when every path is a hit", async () => {
    configure({ allowExternalLlm: true });
    const cache = emptyCache("claude-code", "default");
    cache.entries["AGENTS.md"] = {
      hash: hashContent("agents body"),
      findings: [
        {
          path: "AGENTS.md",
          reason: "semantic_bloat",
          bytes: 10,
          estTokens: 3,
          action: "excluded",
          source: "llm",
        },
      ],
    };
    loadEnrichCache.mockResolvedValue(cache);

    const outcome = await run({ bypassCache: true });

    expect(enrich).toHaveBeenCalledOnce();
    expect(outcome.fullCacheHit).toBe(false);
    expect(outcome.cacheHitCount).toBe(0);
    expect(saveEnrichCache).toHaveBeenCalledOnce();
  });
});
