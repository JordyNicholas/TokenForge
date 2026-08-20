import { afterEach, describe, expect, it, vi } from "vitest";
import { ollamaEnricher } from "./ollama";

function jsonResponse(content: unknown) {
  return {
    ok: true,
    json: async () => ({
      message: {
        content: JSON.stringify(content),
      },
    }),
  };
}

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

  it("maps multi-pass Ollama JSON findings", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: { content?: string }[];
      };
      const prompt = body.messages?.[0]?.content ?? "";

      if (prompt.includes("compact context map")) {
        return jsonResponse({
          hubs: ["README.md"],
          clusters: [],
          batchHints: [],
          suspects: ["README.md"],
        });
      }

      if (prompt.includes("reconcile TokenForge LLM findings")) {
        return jsonResponse({
          findings: [
            {
              path: "README.md",
              verdict: "exclude",
              reason: "low_signal_config",
              confidence: 0.8,
              detail: "Mostly boilerplate",
            },
          ],
        });
      }

      return jsonResponse({
        findings: [
          {
            path: "README.md",
            verdict: "exclude",
            reason: "low_signal_config",
            confidence: 0.75,
            detail: "Mostly boilerplate",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

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

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
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
