import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeError } from "../errors";
import { fetchWithTimeout } from "../fetchWithTimeout";
import { ollamaEnricher } from "./ollama";

vi.mock("../fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

const fetchMock = vi.mocked(fetchWithTimeout);

function jsonResponse(content: unknown) {
  return {
    ok: true,
    json: async () => ({
      message: {
        content: JSON.stringify(content),
      },
    }),
    text: async () => "",
  };
}

function tagsOkResponse() {
  return {
    ok: true,
    json: async () => ({ models: [] }),
    text: async () => '{"models":[]}',
  };
}

function mapPassResponse() {
  return jsonResponse({
    hubs: ["README.md"],
    clusters: [],
    batchHints: [],
    suspects: ["README.md"],
  });
}

function judgePassResponse() {
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
}

function reconcilePassResponse() {
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

function connectionResetError(): TypeError {
  const error = new TypeError("fetch failed");
  (error as Error & { cause: { code: string } }).cause = { code: "ECONNRESET" };
  return error;
}

function headersTimeoutError(): TypeError {
  const error = new TypeError("fetch failed");
  (error as Error & { cause: Error & { code: string } }).cause = Object.assign(
    new Error("Headers Timeout Error"),
    { code: "UND_ERR_HEADERS_TIMEOUT" },
  );
  return error;
}

function isTagsRequest(url: string): boolean {
  return url.includes("/api/tags");
}

describe("ollamaEnricher", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps multi-pass Ollama JSON findings", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (isTagsRequest(String(url))) {
        return tagsOkResponse() as Response;
      }

      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: { content?: string }[];
      };
      const prompt = body.messages?.[0]?.content ?? "";

      if (prompt.includes("compact context map")) {
        return mapPassResponse() as Response;
      }

      if (prompt.includes("reconcile TokenForge LLM findings")) {
        return reconcilePassResponse() as Response;
      }

      return judgePassResponse() as Response;
    });

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

    expect(fetchMock.mock.calls.some(([url]) => isTagsRequest(String(url)))).toBe(
      true,
    );
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      path: "README.md",
      source: "llm",
      reason: "low_signal_config",
      action: "excluded",
    });
    expect(result.meta.candidatesSent).toBe(1);
  });

  it("retries transient fetch failures then succeeds", async () => {
    vi.useFakeTimers();
    let chatAttempts = 0;
    const onProgress = vi.fn();
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (isTagsRequest(String(url))) {
        return tagsOkResponse() as Response;
      }

      chatAttempts += 1;
      if (chatAttempts <= 2) {
        throw connectionResetError();
      }

      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: { content?: string }[];
      };
      const prompt = body.messages?.[0]?.content ?? "";

      if (prompt.includes("compact context map")) {
        return mapPassResponse() as Response;
      }
      if (prompt.includes("reconcile TokenForge LLM findings")) {
        return reconcilePassResponse() as Response;
      }
      return judgePassResponse() as Response;
    });

    const pending = ollamaEnricher.enrich({
      root: "/tmp",
      model: "qwen2.5-coder:7b",
      endpoint: "http://127.0.0.1:11434",
      timeoutMs: 60_000,
      onProgress,
      candidates: [
        {
          path: "README.md",
          bytes: 800,
          estTokens: 200,
          excerpt: "# Demo",
        },
      ],
    });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.findings).toHaveLength(1);
    expect(
      onProgress.mock.calls.some(([message]) =>
        String(message).includes("transient error, retrying"),
      ),
    ).toBe(true);
  });

  it("throws RuntimeError with cause after exhausting retries", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async (url: string) => {
      if (isTagsRequest(String(url))) {
        return tagsOkResponse() as Response;
      }
      throw connectionResetError();
    });

    const pending = ollamaEnricher.enrich({
      root: "/tmp",
      model: "qwen2.5-coder:7b",
      endpoint: "http://127.0.0.1:11434",
      timeoutMs: 60_000,
      candidates: [
        {
          path: "README.md",
          bytes: 800,
          estTokens: 200,
          excerpt: "# Demo",
        },
      ],
    });
    const expectation = expect(pending).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(RuntimeError);
      expect(String((error as Error).message)).toContain(
        "Cannot reach Ollama at http://127.0.0.1:11434",
      );
      expect(String((error as Error).message)).toContain("ECONNRESET");
      return true;
    });
    await vi.runAllTimersAsync();
    await expectation;
  });

  it("does not retry AbortError timeouts", async () => {
    let chatCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (isTagsRequest(String(url))) {
        return tagsOkResponse() as Response;
      }
      chatCalls += 1;
      const error = new Error("This operation was aborted");
      error.name = "AbortError";
      throw error;
    });

    await expect(
      ollamaEnricher.enrich({
        root: "/tmp",
        model: "qwen2.5-coder:7b",
        endpoint: "http://127.0.0.1:11434",
        timeoutMs: 60_000,
        candidates: [
          {
            path: "README.md",
            bytes: 800,
            estTokens: 200,
            excerpt: "# Demo",
          },
        ],
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(RuntimeError);
      expect(String((error as Error).message)).toMatch(/timed out after 60s/);
      return true;
    });

    // Pass A + Pass A repair + Pass B (AbortError is never retried inside withRetries).
    expect(chatCalls).toBe(3);
  });

  it("maps UND_ERR_HEADERS_TIMEOUT to a timeout without transient retries", async () => {
    const onProgress = vi.fn();
    let chatCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (isTagsRequest(String(url))) {
        return tagsOkResponse() as Response;
      }
      chatCalls += 1;
      throw headersTimeoutError();
    });

    await expect(
      ollamaEnricher.enrich({
        root: "/tmp",
        model: "qwen2.5-coder:7b",
        endpoint: "http://127.0.0.1:11434",
        timeoutMs: 60_000,
        onProgress,
        candidates: [
          {
            path: "README.md",
            bytes: 800,
            estTokens: 200,
            excerpt: "# Demo",
          },
        ],
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(RuntimeError);
      expect(String((error as Error).message)).toMatch(/timed out after 60s/);
      return true;
    });

    // Pass A + repair + Pass B — one attempt each, no undici-timeout retries.
    expect(chatCalls).toBe(3);
    expect(
      onProgress.mock.calls.some(([message]) =>
        String(message).includes("transient error, retrying"),
      ),
    ).toBe(false);
  });

  it("passes --llm-timeout through to fetchWithTimeout for chat calls", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (isTagsRequest(String(url))) {
        return tagsOkResponse() as Response;
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: { content?: string }[];
      };
      const prompt = body.messages?.[0]?.content ?? "";
      if (prompt.includes("compact context map")) {
        return mapPassResponse() as Response;
      }
      if (prompt.includes("reconcile TokenForge LLM findings")) {
        return reconcilePassResponse() as Response;
      }
      return judgePassResponse() as Response;
    });

    await ollamaEnricher.enrich({
      root: "/tmp",
      model: "qwen2.5-coder:7b",
      endpoint: "http://127.0.0.1:11434",
      timeoutMs: 120_000,
      candidates: [
        {
          path: "README.md",
          bytes: 800,
          estTokens: 200,
          excerpt: "# Demo",
        },
      ],
    });

    const chatCall = fetchMock.mock.calls.find(
      ([url]) => !isTagsRequest(String(url)),
    );
    expect(chatCall?.[2]).toBe(120_000);
  });

  it("fails fast when preflight /api/tags is unreachable", async () => {
    fetchMock.mockImplementation(async () => {
      throw connectionResetError();
    });

    await expect(
      ollamaEnricher.enrich({
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
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(RuntimeError);
      expect(String((error as Error).message)).toContain("Cannot reach Ollama");
      expect(String((error as Error).message)).toContain("ECONNRESET");
      return true;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isTagsRequest(String(fetchMock.mock.calls[0]?.[0]))).toBe(true);
  });
});
