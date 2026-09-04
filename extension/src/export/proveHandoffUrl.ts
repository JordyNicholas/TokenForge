import { env, workspace } from "vscode";

const DEFAULT_DASHBOARD_BASE = "http://127.0.0.1:5173/board/combined";

/** Dashboard base URL for Prove handoff (workspace override or local Vite default). */
export function dashboardBaseUrl(): string {
  const configured = workspace
    .getConfiguration("tokenforge")
    .get<string>("dashboardBaseUrl")
    ?.trim();
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }
  return DEFAULT_DASHBOARD_BASE;
}

/**
 * Build dashboard URL with session-stats boot param.
 * Stage `session-stats.json` to dashboard/public or serve repo root for file URLs.
 */
export function buildSessionProveUrl(options?: {
  includeScan?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options?.includeScan !== false) {
    params.set("src", "/last-scan.json");
  }
  params.set("session", "/session-stats.json");
  return `${dashboardBaseUrl()}?${params.toString()}`;
}

/** Copy text to clipboard when supported. */
export async function copyToClipboard(text: string): Promise<boolean> {
  await env.clipboard.writeText(text);
  return true;
}
