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
  it("reports Off and keeps Detect heuristic when disabled", () => {
    const view = describeEnrichmentStatus({ enrichmentEnabled: false, llm: "ollama:qwen2.5-coder:3b" });
    expect(view.on).toBe(false);
    expect(view.headline).toContain("Off");
    expect(view.headline.toLowerCase()).toContain("heuristic");
  });

  it("reports On with backend:model when enabled with a real model", () => {
    const view = describeEnrichmentStatus({
      enrichmentEnabled: true,
      llm: "ollama:qwen2.5-coder:3b",
    });
    expect(view.on).toBe(true);
    expect(view.hasModel).toBe(true);
    expect(view.headline).toBe("AI enrichment: On — ollama:qwen2.5-coder:3b");
    expect(view.detail).toContain("bounded candidate set");
  });

  it("flags On-but-no-model when backend is noop", () => {
    const view = describeEnrichmentStatus({ enrichmentEnabled: true, llm: "noop" });
    expect(view.on).toBe(true);
    expect(view.hasModel).toBe(false);
    expect(view.headline).toContain("no model set");
    expect(view.detail).toContain("tokenforge.llm");
  });

  it("surfaces the last successful run detail", () => {
    const view = describeEnrichmentStatus(
      { enrichmentEnabled: true, llm: "ollama:qwen2.5-coder:3b" },
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
