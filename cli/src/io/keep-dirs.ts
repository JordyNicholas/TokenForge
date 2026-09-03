import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  classifyFiletype,
  protectionFor,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { shouldSkipWalkDirectory } from "./paths";

/** Classes a policy glob must not hide from the agent that needs them. */
const KEPT_CLASSES = new Set(["source", "config"]);

/** Most Prefer roots worth naming before the line stops being readable. */
const MAX_SOURCE_ROOTS = 4;

export type KeptContent = {
  /** Directories holding kept content; a glob is never widened to one. */
  keepDirs: Set<string>;
  /** Top-level directories holding living source, busiest first. */
  sourceRoots: string[];
};

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

/** Every proper ancestor directory of a repo-relative file path. */
function ancestorDirs(path: string): string[] {
  const segments = path.split("/").filter(Boolean);
  const dirs: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    dirs.push(segments.slice(0, index).join("/"));
  }
  return dirs;
}

/**
 * Directories holding a path the policy pack keeps — source, config, or a
 * protected contract — that is not itself excluded.
 *
 * `collapseExclusionPaths` only receives the excluded paths, so it cannot tell
 * `core/fonts` (nothing but two `.ttf`) from `core` (the library source). The
 * scan report does not carry the keep-set either: `findings` are at-risk paths
 * only. So apply walks the tree once and answers the question directly.
 *
 * Cheap by construction: `readdir` with `withFileTypes`, no `stat` and no file
 * reads — classification is by path shape alone.
 */
export async function collectKeptContent(
  root: string,
  report: Pick<TokenRiskReport, "findings">,
): Promise<KeptContent> {
  const rootResolved = resolve(root);
  const excluded = new Set(
    report.findings
      .filter((finding) => finding.action === "excluded")
      .map((finding) => toPosix(finding.path)),
  );
  const keepDirs = new Set<string>();
  // Only `source` counts toward Prefer: a repo-root `docs/` holds kept content
  // (so no glob may claim it) without being where anyone should read code.
  const sourceWeight = new Map<string, number>();

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // An unreadable directory cannot be attested about; leaving it out of
      // keepDirs only means collapse falls back to its depth/count floors.
      return;
    }

    const relativeDir = toPosix(relative(rootResolved, dir));
    const parentForSkip = relativeDir === "" ? "." : relativeDir;

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        if (!shouldSkipWalkDirectory(entry.name, parentForSkip)) {
          await walk(join(dir, entry.name));
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const path = toPosix(relative(rootResolved, join(dir, entry.name)));
      if (excluded.has(path)) {
        continue;
      }
      const fileClass = classifyFiletype(path);
      const kept =
        KEPT_CLASSES.has(fileClass) || protectionFor(path) !== undefined;
      if (!kept) {
        continue;
      }
      const ancestors = ancestorDirs(path);
      for (const ancestor of ancestors) {
        keepDirs.add(ancestor);
      }
      const root = ancestors[0];
      if (fileClass === "source" && root !== undefined) {
        sourceWeight.set(root, (sourceWeight.get(root) ?? 0) + 1);
      }
    }
  }

  await walk(rootResolved);

  const sourceRoots = [...sourceWeight.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_SOURCE_ROOTS)
    .map(([dir]) => dir);

  return { keepDirs, sourceRoots };
}
