import { describe, expect, it, vi } from "vitest";
import {
  formatFetchFailure,
  isTransientFetchError,
  isTransientHttpStatus,
  TransientHttpError,
  withRetries,
} from "./httpRetry";

describe("isTransientFetchError", () => {
  it("detects fetch failed with ECONNRESET cause", () => {
    const error = new TypeError("fetch failed");
    (error as Error & { cause: { code: string } }).cause = {
      code: "ECONNRESET",
    };
    expect(isTransientFetchError(error)).toBe(true);
  });

  it("detects TransientHttpError", () => {
    expect(isTransientFetchError(new TransientHttpError(503, "down"))).toBe(
      true,
    );
  });

  it("does not treat AbortError as transient", () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    expect(isTransientFetchError(error)).toBe(false);
  });

  it("does not treat UND_ERR_HEADERS_TIMEOUT as transient", () => {
    const error = new TypeError("fetch failed");
    (error as Error & { cause: Error & { code: string } }).cause = Object.assign(
      new Error("Headers Timeout Error"),
      { code: "UND_ERR_HEADERS_TIMEOUT" },
    );
    expect(isTransientFetchError(error)).toBe(false);
  });
});

describe("isTransientHttpStatus", () => {
  it("flags gateway and overload statuses", () => {
    expect(isTransientHttpStatus(502)).toBe(true);
    expect(isTransientHttpStatus(503)).toBe(true);
    expect(isTransientHttpStatus(529)).toBe(true);
    expect(isTransientHttpStatus(400)).toBe(false);
    expect(isTransientHttpStatus(500)).toBe(false);
  });
});

describe("formatFetchFailure", () => {
  it("includes cause codes", () => {
    const error = new TypeError("fetch failed");
    (error as Error & { cause: Error & { code: string } }).cause = Object.assign(
      new Error("connect ECONNREFUSED 127.0.0.1:11434"),
      { code: "ECONNREFUSED" },
    );
    expect(formatFetchFailure(error)).toContain("fetch failed");
    expect(formatFetchFailure(error)).toContain("ECONNREFUSED");
  });
});

describe("withRetries", () => {
  it("retries transient errors then succeeds", async () => {
    const sleep = vi.fn(async () => undefined);
    let calls = 0;
    const result = await withRetries(
      async () => {
        calls += 1;
        if (calls < 3) {
          const error = new TypeError("fetch failed");
          (error as Error & { cause: { code: string } }).cause = {
            code: "ECONNRESET",
          };
          throw error;
        }
        return "ok";
      },
      { attempts: 3, baseDelayMs: 10, sleep },
    );

    expect(result).toBe("ok");
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
  });

  it("rethrows after exhausting retries", async () => {
    const sleep = vi.fn(async () => undefined);
    const error = new TypeError("fetch failed");
    (error as Error & { cause: { code: string } }).cause = {
      code: "ECONNREFUSED",
    };

    await expect(
      withRetries(
        async () => {
          throw error;
        },
        { attempts: 3, baseDelayMs: 1, sleep },
      ),
    ).rejects.toBe(error);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry AbortError", async () => {
    const sleep = vi.fn(async () => undefined);
    const error = new Error("aborted");
    error.name = "AbortError";
    let calls = 0;

    await expect(
      withRetries(
        async () => {
          calls += 1;
          throw error;
        },
        { attempts: 3, baseDelayMs: 1, sleep },
      ),
    ).rejects.toBe(error);
    expect(calls).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
