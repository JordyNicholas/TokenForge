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

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/\/+$/, "");
}

function basename(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

function isCollapsePreferred(dir: string): boolean {
  return COLLAPSE_DIR_HINTS.has(basename(dir));
}

/**
 * Collapse many excluded file paths into directory globs when safe.
 * Prefers known generated-tree directory names (e.g. `client/**`) so policy
 * packs stay short; leaves unrelated single files intact.
 */
export function collapseExclusionPaths(paths: readonly string[]): string[] {
  const files = [
    ...new Set(paths.map(normalizePath).filter((path) => path.length > 0)),
  ].sort((a, b) => a.localeCompare(b));

  if (files.length <= 1) {
    return files;
  }

  const cover = new Map<string, string[]>();
  for (const file of files) {
    const segments = file.split("/").filter(Boolean);
    for (let index = 1; index < segments.length; index += 1) {
      const dir = segments.slice(0, index).join("/");
      const list = cover.get(dir) ?? [];
      list.push(file);
      cover.set(dir, list);
    }
  }

  const candidates = [...cover.entries()]
    .filter(([, covered]) => covered.length >= 2)
    .sort((a, b) => {
      const pref = Number(isCollapsePreferred(b[0])) - Number(isCollapsePreferred(a[0]));
      if (pref !== 0) {
        return pref;
      }
      if (b[1].length !== a[1].length) {
        return b[1].length - a[1].length;
      }
      // Prefer shorter (shallower) paths when coverage ties — fewer globs.
      return a[0].length - b[0].length || a[0].localeCompare(b[0]);
    });

  const consumed = new Set<string>();
  const globs: string[] = [];

  for (const [dir, covered] of candidates) {
    const pending = covered.filter((file) => !consumed.has(file));
    if (pending.length < 2) {
      continue;
    }
    // Prefer hinted dirs, or any dir that swallows 3+ remaining files.
    if (!isCollapsePreferred(dir) && pending.length < 3) {
      continue;
    }
    globs.push(`${dir}/**`);
    for (const file of pending) {
      consumed.add(file);
    }
  }

  const rest = files.filter((file) => !consumed.has(file));
  return [...globs, ...rest].sort((a, b) => a.localeCompare(b));
}
