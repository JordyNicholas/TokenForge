import { readFile } from "node:fs/promises";
import { isTokenRiskReport } from "@tokenforge/risk-core";
import { RuntimeError } from "../app/errors";

/**
 * Read the session's open paths from `--active-paths-file`.
 *
 * Two accepted shapes, because two different producers exist:
 * - A Token Risk report — what the extension already writes to
 *   `.tokenforge/last-scan.json`; its `activePaths` field is used.
 * - A bare JSON array of strings — the obvious hand-authored or
 *   CI-generated form.
 *
 * There is deliberately no auto-detection of `.tokenforge/last-scan.json`.
 * A stale export from last week would silently protect paths nobody has open
 * any more, quietly weakening the policy pack with nothing in the output to
 * show why. Opting in per run keeps the signal's freshness the caller's
 * explicit claim.
 */
export async function readActivePathsFile(path: string): Promise<string[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RuntimeError(`Cannot read --active-paths-file ${path}: ${reason}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new RuntimeError(`${path} is not valid JSON.`);
  }

  if (Array.isArray(parsed)) {
    if (!parsed.every((entry) => typeof entry === "string")) {
      throw new RuntimeError(`${path} must be an array of strings.`);
    }
    return normalizeAll(parsed as string[]);
  }

  if (isTokenRiskReport(parsed)) {
    // A report with no activePaths is not an error — it just carries no
    // session signal, e.g. one written by the CLI rather than the extension.
    return normalizeAll(parsed.activePaths ?? []);
  }

  throw new RuntimeError(
    `${path} is neither a Token Risk report nor an array of paths.`,
  );
}

function normalizeAll(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const path of paths) {
    const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "").trim();
    if (normalized.length > 0) {
      seen.add(normalized);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
