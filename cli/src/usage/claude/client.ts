import { RuntimeError } from "../../app/errors";

export type ClaudeFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type ClaudeClient = {
  fetch: ClaudeFetch;
  apiBase: string;
};

export type ClaudeClientOptions = {
  apiKey: string;
  apiBase?: string;
  fetchImpl?: ClaudeFetch;
  anthropicVersion?: string;
};

const DEFAULT_API = "https://api.anthropic.com";
const DEFAULT_VERSION = "2023-06-01";

/** Minimal Anthropic Usage & Cost Admin API client (#92). */
export function createClaudeClient(options: ClaudeClientOptions): ClaudeClient {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new RuntimeError("Anthropic Admin API key is required for live Claude usage sync.");
  }
  const apiBase = (options.apiBase ?? DEFAULT_API).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const anthropicVersion = options.anthropicVersion ?? DEFAULT_VERSION;

  return {
    apiBase,
    fetch: async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("x-api-key", apiKey);
      headers.set("anthropic-version", anthropicVersion);
      return fetchImpl(url, { ...init, headers });
    },
  };
}

export function resolveClaudeAdminApiKey(explicit?: string): string {
  const apiKey =
    explicit?.trim() ||
    process.env.ANTHROPIC_ADMIN_API_KEY?.trim() ||
    process.env.ANTHROPIC_ADMIN_KEY?.trim();
  if (!apiKey) {
    throw new RuntimeError(
      "Set ANTHROPIC_ADMIN_API_KEY (Console Admin key) for live Claude usage sync.",
    );
  }
  return apiKey;
}

export async function readClaudeJsonResponse<T>(
  response: Response,
  context: string,
): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new RuntimeError(
      `${context}: Anthropic API ${response.status}${text ? ` — ${text.slice(0, 240)}` : ""}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RuntimeError(`${context}: response is not JSON.`);
  }
}
