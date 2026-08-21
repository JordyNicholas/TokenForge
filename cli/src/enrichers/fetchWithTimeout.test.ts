import { afterEach, describe, expect, it, vi } from "vitest";
import { Agent, fetch as undiciFetch } from "undici";
import { fetchWithTimeout } from "./fetchWithTimeout";

vi.mock("undici", () => {
  const close = vi.fn(async () => undefined);
  const AgentMock = vi.fn(function AgentMock(this: { close: typeof close }, options: unknown) {
    this.close = close;
    return { close, options };
  });
  return {
    Agent: AgentMock,
    fetch: vi.fn(async () => ({ ok: true, status: 200 })),
  };
});

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.mocked(Agent).mockClear();
    vi.mocked(undiciFetch).mockClear();
  });

  it("creates an Agent with headers/body timeouts matching timeoutMs", async () => {
    await fetchWithTimeout(
      "http://127.0.0.1:11434/api/chat",
      { method: "POST", body: "{}" },
      900_000,
    );

    expect(Agent).toHaveBeenCalledWith({
      headersTimeout: 900_000,
      bodyTimeout: 900_000,
      connectTimeout: 60_000,
    });
    expect(undiciFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        dispatcher: expect.anything(),
      }),
    );
  });
});
