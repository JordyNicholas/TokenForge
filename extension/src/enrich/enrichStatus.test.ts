import { afterEach, describe, expect, it } from "vitest";
import {
  __resetEnrichStatus,
  describeEnrichmentStatus,
  getLastEnrichRun,
  onEnrichStatusChange,
  recordEnrichRun,
} from "./enrichStatus";

afterEach(() => __resetEnrichStatus());

describe("describeEnrichmentStatus", () => {
  it("reports packs vs analyze when enrichment is off", () => {
    const view = describeEnrichmentStatus({
      enrichmentEnabled: false,
      llm: "ollama:qwen2.5-coder:3b",
      provider: "claude",
    });
    expect(view.on).toBe(false);
    expect(view.provider).toBe("claude");
    expect(view.headline).toBe(
      "Writing packs for claude · Analyzing off (Detect stays heuristic)",
    );
  });

  it("reports On with Writing packs · Analyzing with backend:model", () => {
    const view = describeEnrichmentStatus({
      enrichmentEnabled: true,
      llm: "ollama:qwen2.5-coder:3b",
      provider: "cursor",
    });
    expect(view.on).toBe(true);
    expect(view.hasModel).toBe(true);
    expect(view.headline).toBe(
      "Writing packs for cursor · Analyzing with ollama:qwen2.5-coder:3b",
    );
    expect(view.detail).toContain("bounded candidate set");
  });

  it("flags On-but-no-model when backend is noop", () => {
    const view = describeEnrichmentStatus({
      enrichmentEnabled: true,
      llm: "noop",
      provider: "generic",
    });
    expect(view.on).toBe(true);
    expect(view.hasModel).toBe(false);
    expect(view.headline).toContain("Writing packs for generic");
    expect(view.headline).toContain("no-op");
    expect(view.detail).toContain("tokenforge.llm");
  });

  it("surfaces the last successful run detail", () => {
    const view = describeEnrichmentStatus(
      { enrichmentEnabled: true, llm: "ollama:qwen2.5-coder:3b", provider: "copilot" },
      { at: 1, ok: true, findingCount: 3, candidateCount: 4, backend: "ollama", model: "qwen2.5-coder:3b" },
    );
    expect(view.detail).toBe("Last analyzed 4 file(s) → 3 finding(s)");
  });

  it("surfaces the last failed run detail", () => {
    const view = describeEnrichmentStatus(
      { enrichmentEnabled: true, llm: "ollama:qwen2.5-coder:3b" },
      {
        at: 1,
        ok: false,
        findingCount: 0,
        candidateCount: 4,
        backend: "ollama",
        model: "qwen2.5-coder:3b",
        error: "cannot reach Ollama",
      },
    );
    expect(view.detail).toBe("Last run failed: cannot reach Ollama");
  });
});

describe("enrich status store", () => {
  it("records the last run and notifies listeners", () => {
    let calls = 0;
    const sub = onEnrichStatusChange(() => {
      calls += 1;
    });
    expect(getLastEnrichRun()).toBeUndefined();

    recordEnrichRun({ at: 5, ok: true, findingCount: 2, candidateCount: 3, backend: "ollama", model: "m" });
    expect(getLastEnrichRun()?.findingCount).toBe(2);
    expect(calls).toBe(1);

    sub.dispose();
    recordEnrichRun({ at: 6, ok: true, findingCount: 9, candidateCount: 9, backend: "ollama", model: "m" });
    expect(calls).toBe(1);
    expect(getLastEnrichRun()?.findingCount).toBe(9);
  });
});
