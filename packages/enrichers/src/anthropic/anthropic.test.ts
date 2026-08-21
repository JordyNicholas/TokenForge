import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeError } from "../errors";
import { anthropicEnricher } from "./anthropic";

describe("anthropicEnricher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns empty findings when there are no candidates", async () => {
    const result = await anthropicEnricher.enrich({
      root: "/tmp",
      candidates: [],
      model: "claude-sonnet-4-5",
    });

    expect(result.findings).toEqual([]);
    expect(result.meta).toMatchObject({
      backend: "anthropic",
      candidatesSent: 0,
    });
  });

  it("maps Anthropic JSON findings", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
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
          ],
          stop_reason: "end_turn",
        }),
      })),
    );

    const result = await anthropicEnricher.enrich({
      root: "/tmp",
      model: "claude-sonnet-4-5",
      endpoint: "https://api.anthropic.com/v1",
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

  it("throws a RuntimeError when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      anthropicEnricher.enrich({
        root: "/tmp",
        model: "claude-sonnet-4-5",
        candidates: [{ path: "README.md", bytes: 800, estTokens: 200, excerpt: "# Demo" }],
      }),
    ).rejects.toBeInstanceOf(RuntimeError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws a RuntimeError on a non-2xx response", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => '{"error":{"message":"invalid x-api-key"}}',
      })),
    );

    await expect(
      anthropicEnricher.enrich({
        root: "/tmp",
        model: "claude-sonnet-4-5",
        candidates: [{ path: "README.md", bytes: 800, estTokens: 200, excerpt: "# Demo" }],
      }),
    ).rejects.toBeInstanceOf(RuntimeError);
  });
});
