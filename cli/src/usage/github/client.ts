import { RuntimeError } from "../../app/errors";

export type GitHubFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type GitHubClient = {
  fetch: GitHubFetch;
  apiBase: string;
};

export type GitHubClientOptions = {
  token: string;
  apiBase?: string;
  fetchImpl?: GitHubFetch;
};

const DEFAULT_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

/** Minimal GitHub REST client for Prove usage adapters (#90). */
export function createGitHubClient(options: GitHubClientOptions): GitHubClient {
  const token = options.token.trim();
  if (!token) {
    throw new RuntimeError("GitHub token is required for live Copilot usage sync.");
  }
  const apiBase = (options.apiBase ?? DEFAULT_API).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  return {
    apiBase,
    fetch: async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Accept", "application/vnd.github+json");
      headers.set("X-GitHub-Api-Version", API_VERSION);
      return fetchImpl(url, { ...init, headers });
    },
  };
}

export function resolveGitHubToken(explicit?: string): string {
  const token =
    explicit?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.GITHUB_COPILOT_USAGE_TOKEN?.trim();
  if (!token) {
    throw new RuntimeError(
      "Set GITHUB_TOKEN (org admin PAT with billing + Copilot metrics) for live Copilot usage.",
    );
  }
  return token;
}

export async function readJsonResponse<T>(response: Response, context: string): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new RuntimeError(
      `${context}: GitHub API ${response.status}${text ? ` — ${text.slice(0, 240)}` : ""}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RuntimeError(`${context}: response is not JSON.`);
  }
}
