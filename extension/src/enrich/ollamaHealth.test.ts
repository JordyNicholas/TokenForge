import { afterEach, describe, expect, it, vi } from "vitest";
import { isOllamaReachable, resolveOllamaEndpoint } from "./ollamaHealth";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("resolveOllamaEndpoint", () => {
  it("defaults to the local endpoint when unset/blank", () => {
    expect(resolveOllamaEndpoint()).toBe("http://127.0.0.1:11434");
    expect(resolveOllamaEndpoint("   ")).toBe("http://127.0.0.1:11434");
  });

  it("honors an explicit endpoint", () => {
    expect(resolveOllamaEndpoint("http://host:1234")).toBe("http://host:1234");
  });
});

describe("isOllamaReachable", () => {
  it("returns true when /api/tags responds ok", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(isOllamaReachable("http://127.0.0.1:11434")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/tags",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("returns false when the server is down (fetch rejects)", async () => {
    globalThis.fetch = (vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown) as typeof fetch;

    await expect(isOllamaReachable("http://127.0.0.1:11434", 50)).resolves.toBe(false);
  });

  it("returns false on a non-ok response", async () => {
    globalThis.fetch = (vi.fn(async () => ({ ok: false }) as Response) as unknown) as typeof fetch;
    await expect(isOllamaReachable()).resolves.toBe(false);
  });
});
