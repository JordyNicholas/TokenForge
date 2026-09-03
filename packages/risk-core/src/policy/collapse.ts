/** Directories that are safe to collapse to `dir/**` when ≥2 excluded files share them. */
const COLLAPSE_DIR_HINTS = new Set([
  "client",
  "dist",
  "build",
  "out",
  "coverage",
  "generated",
  ".prisma",
  "node_modules",
  "vendor",
  "target",
  ".next",
]);

/**
 * Excluded files a directory needs before a glob beats listing the files.
 * Only applies to directories not named in {@link COLLAPSE_DIR_HINTS}.
 */
const MIN_COLLAPSE_FILES = 3;

/**
 * Shallowest directory an unhinted glob may speak for. A repo-root directory
 * (`core`, `docs`, `shared`, `src`) is load-bearing by convention, so a handful
 * of stray assets inside it must never turn into `core/**`.
 */
const MIN_COLLAPSE_DEPTH = 2;

export type CollapseOptions = {
  /**
   * Directories that also hold scored paths outside the excluded set — source,
   * config, or protected. A glob is never widened to one of these.
   *
   * Collapse only ever sees the paths that were excluded, so it cannot notice
   * an `openapi.yaml` or a `core/js/tabler.js` sitting beside them; the caller
   * that walked the tree has to say so. Callers that cannot attest pass nothing
   * and keep the depth/count floors as their only guard.
   */
  keepDirs?: ReadonlySet<string>;
};

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/\/+$/, "");
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function basename(path: string): string {
  const segments = segmentsOf(path);
  return segments[segments.length - 1] ?? path;
}

function depthOf(dir: string): number {
  return segmentsOf(dir).length;
}

function isCollapsePreferred(dir: string): boolean {
  return COLLAPSE_DIR_HINTS.has(basename(dir));
}

/** Every proper ancestor directory of `dir`, nearest first. */
function ancestorsOf(dir: string): string[] {
  const segments = segmentsOf(dir);
  const ancestors: string[] = [];
  for (let index = segments.length - 1; index > 0; index -= 1) {
    ancestors.push(segments.slice(0, index).join("/"));
  }
  return ancestors;
}

/**
 * Collapse many excluded file paths into directory globs when safe.
 *
 * A glob must never exclude more than the findings justify. Two rules keep the
 * blast radius honest:
 *
 * - **Deepest cluster wins.** Candidates are tried deepest-first, so the
 *   tightest directory that covers a cluster speaks for it. Sorting by covered
 *   count instead (the previous behaviour) picked the shallowest heavy
 *   directory, so ~230 assets under `shared/static/**` collapsed all the way up
 *   to `shared/**` and swallowed the source beside them.
 * - **Once a subtree collapses, its ancestors are out.** Otherwise a parent
 *   would mop up whatever the deeper globs left behind and re-widen to the very
 *   directory the depth rule just refused.
 *
 * Known throwaway directory names (`dist`, `client`, `generated`, …) keep the
 * old fast path: they are tried first, shallowest-first, and are exempt from the
 * depth and count floors — a generated tree is safe to name wholesale.
 *
 * `options.keepDirs` closes the gap those rules cannot see: a directory that
 * also holds a kept source, config, or protected path is never globbed, however
 * deep it sits or how many excluded files it covers.
 */
export function collapseExclusionPaths(
  paths: readonly string[],
  options: CollapseOptions = {},
): string[] {
  const files = [
    ...new Set(paths.map(normalizePath).filter((path) => path.length > 0)),
  ].sort((a, b) => a.localeCompare(b));

  if (files.length <= 1) {
    return files;
  }

  const cover = new Map<string, string[]>();
  for (const file of files) {
    const segments = segmentsOf(file);
    for (let index = 1; index < segments.length; index += 1) {
      const dir = segments.slice(0, index).join("/");
      const list = cover.get(dir) ?? [];
      list.push(file);
      cover.set(dir, list);
    }
  }

  const candidates = [...cover.entries()].sort((a, b) => {
    const preferredA = isCollapsePreferred(a[0]);
    const preferredB = isCollapsePreferred(b[0]);
    if (preferredA !== preferredB) {
      return preferredA ? -1 : 1;
    }
    // Hinted trees read best as one glob, so the outermost one wins; everything
    // else is tried deepest-first so the narrowest glob claims its cluster.
    const depth = preferredA
      ? depthOf(a[0]) - depthOf(b[0])
      : depthOf(b[0]) - depthOf(a[0]);
    if (depth !== 0) {
      return depth;
    }
    if (b[1].length !== a[1].length) {
      return b[1].length - a[1].length;
    }
    return a[0].localeCompare(b[0]);
  });

  const consumed = new Set<string>();
  const blocked = new Set<string>();
  const globs: string[] = [];

  for (const [dir, covered] of candidates) {
    if (blocked.has(dir) || options.keepDirs?.has(dir)) {
      continue;
    }
    const preferred = isCollapsePreferred(dir);
    const pending = covered.filter((file) => !consumed.has(file));
    if (pending.length < (preferred ? 2 : MIN_COLLAPSE_FILES)) {
      continue;
    }
    if (!preferred && depthOf(dir) < MIN_COLLAPSE_DEPTH) {
      continue;
    }
    globs.push(`${dir}/**`);
    for (const file of pending) {
      consumed.add(file);
    }
    for (const ancestor of ancestorsOf(dir)) {
      blocked.add(ancestor);
    }
  }

  const rest = files.filter((file) => !consumed.has(file));
  return [...globs, ...rest].sort((a, b) => a.localeCompare(b));
}
