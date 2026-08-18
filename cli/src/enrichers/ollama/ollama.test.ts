import { afterEach, describe, expect, it, vi } from "vitest";
import { ollamaEnricher } from "./ollama";

describe("ollamaEnricher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty findings when there are no candidates", async () => {
    const result = await ollamaEnricher.enrich({
      root: "/tmp",
      candidates: [],
      model: "qwen2.5-coder:7b",
    });

    expect(result.findings).toEqual([]);
    expect(result.meta).toMatchObject({
      backend: "ollama",
      candidatesSent: 0,
    });
  });

  it("maps Ollama JSON findings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              findings: [
                {
                  path: "README.md",
                  verdict: "exclude",
                  reason: "low_signal_config",
                  confidence: 0.75,
                  detail: "Mostly boilerplate",
                },
              ],
            }),
          },
        }),
      })),
    );

    const result = await ollamaEnricher.enrich({
      root: "/tmp",
      model: "qwen2.5-coder:7b",
      endpoint: "http://127.0.0.1:11434",
      candidates: [
        {
          path: "README.md",
          bytes: 800,
          estTokens: 200,
          excerpt: "# Demo",
        },
      ],
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      path: "README.md",
      source: "llm",
      reason: "low_signal_config",
      action: "excluded",
    });
    expect(result.meta.candidatesSent).toBe(1);
  });
});
