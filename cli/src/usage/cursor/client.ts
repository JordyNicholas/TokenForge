import { RuntimeError } from "../../app/errors";

export type CursorFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type CursorClient = {
  fetch: CursorFetch;
  apiBase: string;
};

export type CursorClientOptions = {
  apiKey: string;
  apiBase?: string;
  fetchImpl?: CursorFetch;
};

const DEFAULT_API = "https://api.cursor.com";

/** Minimal Cursor Organization Admin API client (#91). */
export function createCursorClient(options: CursorClientOptions): CursorClient {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new RuntimeError("Cursor Organization API key is required for live usage sync.");
  }
  const apiBase = (options.apiBase ?? DEFAULT_API).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const authorization = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

  return {
    apiBase,
    fetch: async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", authorization);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return fetchImpl(url, { ...init, headers });
    },
  };
}

export function resolveCursorApiKey(explicit?: string): string {
  const apiKey =
    explicit?.trim() ||
    process.env.CURSOR_API_KEY?.trim() ||
    process.env.CURSOR_ORG_API_KEY?.trim();
  if (!apiKey) {
    throw new RuntimeError(
      "Set CURSOR_API_KEY (Organization API key with usage:* scope) for live Cursor usage.",
    );
  }
  return apiKey;
}

export async function readCursorJsonResponse<T>(
  response: Response,
  context: string,
): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new RuntimeError(
      `${context}: Cursor API ${response.status}${text ? ` — ${text.slice(0, 240)}` : ""}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RuntimeError(`${context}: response is not JSON.`);
  }
}
