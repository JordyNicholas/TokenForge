import type { TokenRiskReport } from "../domain/types";

function normalize(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

/**
 * Paths the developer had open when the report was produced.
 *
 * Every other TokenForge signal is a property of the file — its name, its
 * size, its class. This one is a property of the *session*, which is why no
 * amount of static-rule sophistication could replace it: whether a large
 * locale file is waste depends on whether someone is doing i18n work right
 * now, and only the editor knows that.
 *
 * Returns an empty set when the field is absent, so every caller degrades to
 * today's behavior rather than silently protecting nothing or everything.
 */
export function activePathSet(
  report: Pick<TokenRiskReport, "activePaths">,
): ReadonlySet<string> {
  return new Set((report.activePaths ?? []).map(normalize));
}

/**
 * True when `path` must not be written into an exclusion artifact.
 *
 * Checked at every consumer rather than only where findings are built: a
 * report can arrive from an older CLI, from the extension, or hand-edited, and
 * the cost of a stale `action: "excluded"` here is a durable policy file
 * telling the agent to ignore the file its author is editing.
 */
export function isActivePath(
  active: ReadonlySet<string>,
  path: string,
): boolean {
  return active.size > 0 && active.has(normalize(path));
}
