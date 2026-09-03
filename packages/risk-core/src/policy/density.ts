import {
  DENSITY_MIN_MEDIA_RATIO,
  MIN_DENSITY_FILES,
} from "../domain/constants";
import type { FiletypeRiskClass, ProtectionKind } from "../domain/types";

/** Suffix a folded directory carries so every consumer reads it as a subtree. */
export const ASSET_DIR_GLOB_SUFFIX = "/**";

/**
 * True for a path the asset fold produced.
 *
 * The fold is the only thing in this codebase that puts a glob in a finding
 * `path`, and it only ever fires on a directory that is at least
 * {@link DENSITY_MIN_MEDIA_RATIO} `media` — so callers can read the kind of
 * waste straight off the shape without re-deriving it.
 */
export function isAssetDirectoryGlob(path: string): boolean {
  return path.endsWith(ASSET_DIR_GLOB_SUFFIX);
}

/** One scored path, as much of it as the fold needs. */
export type DensityInput = {
  path: string;
  fileClass: FiletypeRiskClass;
  bytes: number;
  estTokens: number;
  protection?: ProtectionKind;
};

export type DensityOptions = {
  /**
   * Paths that must stay individually visible — open editor tabs, typically.
   * Their whole subtree is vetoed rather than just the file: a fold speaks for
   * everything under it, so it cannot be honest about a directory holding one.
   */
  keepPaths?: ReadonlySet<string>;
};

export type AssetDirectoryFold = {
  /** Repo-relative directory the fold speaks for. */
  dir: string;
  /** `dir` plus {@link ASSET_DIR_GLOB_SUFFIX} — what the finding path becomes. */
  glob: string;
  /** Every scored path the fold subsumes, sorted. */
  paths: string[];
  bytes: number;
  estTokens: number;
};

/** Classes that make a directory load-bearing, so nothing may speak over them. */
const KEPT_CLASSES: ReadonlySet<FiletypeRiskClass> = new Set([
  "source",
  "config",
]);

function normalize(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function parentOf(path: string): string | undefined {
  const segments = segmentsOf(path);
  return segments.length > 1 ? segments.slice(0, -1).join("/") : undefined;
}

/** Every directory on the way down to `path`, root-most first. */
function ancestorDirsOf(path: string): string[] {
  const segments = segmentsOf(path);
  const dirs: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    dirs.push(segments.slice(0, index).join("/"));
  }
  return dirs;
}

/**
 * Fold directories that hold nothing but rendered assets into one finding each.
 *
 * The `media` class made every asset visible, which is correct and very loud: a
 * real `tabler` scan turns into ~900 findings whose only interesting property is
 * the directory they share. Collapse can rebuild the globs from those leaves,
 * but it works from the excluded set alone and has to guess; the scan walked the
 * tree and can simply say so.
 *
 * A directory folds when all three hold:
 *
 * 1. it has at least {@link MIN_DENSITY_FILES} files directly in it — a fold has
 *    to earn the loss of per-file detail;
 * 2. at least {@link DENSITY_MIN_MEDIA_RATIO} of those are `media`. Only `media`
 *    counts toward the numerator, so the fold can always report
 *    `high_risk_filetype` honestly; a directory of small `unknown` blobs has no
 *    reason that is true and stays per-file;
 * 3. **nothing anywhere below it is source, config, protected, or kept.** This
 *    is the whole safety argument, and it is recursive rather than per-level: a
 *    directory of icons beside a `scripts/build.ts` two levels down must not
 *    fold, because the glob would reach that file.
 *
 * Shallowest-first, so a pure asset root yields one glob instead of one per
 * subdirectory. That is deliberately wider than `collapseExclusionPaths` will go
 * on its own — collapse refuses repo-root globs precisely because it cannot see
 * what else is in there, and rule 3 is the attestation it lacks.
 */
export function foldAssetDirectories(
  files: readonly DensityInput[],
  options: DensityOptions = {},
): AssetDirectoryFold[] {
  const scored = files.map((file) => ({ ...file, path: normalize(file.path) }));

  // Directories that must never be spoken for, and every directory above them.
  const vetoed = new Set<string>();
  for (const file of scored) {
    const kept =
      KEPT_CLASSES.has(file.fileClass) ||
      file.protection !== undefined ||
      options.keepPaths?.has(file.path) === true;
    if (!kept) {
      continue;
    }
    for (const dir of ancestorDirsOf(file.path)) {
      vetoed.add(dir);
    }
  }

  const directFiles = new Map<string, DensityInput[]>();
  const subtreeFiles = new Map<string, DensityInput[]>();
  for (const file of scored) {
    const parent = parentOf(file.path);
    if (parent !== undefined) {
      directFiles.set(parent, [...(directFiles.get(parent) ?? []), file]);
    }
    for (const dir of ancestorDirsOf(file.path)) {
      subtreeFiles.set(dir, [...(subtreeFiles.get(dir) ?? []), file]);
    }
  }

  const candidates = [...directFiles.entries()]
    .filter(([dir, direct]) => {
      if (vetoed.has(dir) || direct.length < MIN_DENSITY_FILES) {
        return false;
      }
      const media = direct.filter((file) => file.fileClass === "media").length;
      return media / direct.length >= DENSITY_MIN_MEDIA_RATIO;
    })
    .map(([dir]) => dir)
    .sort((a, b) => segmentsOf(a).length - segmentsOf(b).length || a.localeCompare(b));

  const folds: AssetDirectoryFold[] = [];
  const consumed = new Set<string>();

  for (const dir of candidates) {
    const members = (subtreeFiles.get(dir) ?? []).filter(
      (file) => !consumed.has(file.path),
    );
    if (members.length === 0) {
      continue;
    }
    for (const member of members) {
      consumed.add(member.path);
    }
    folds.push({
      dir,
      glob: `${dir}${ASSET_DIR_GLOB_SUFFIX}`,
      paths: members.map((file) => file.path).sort((a, b) => a.localeCompare(b)),
      bytes: members.reduce((sum, file) => sum + file.bytes, 0),
      estTokens: members.reduce((sum, file) => sum + file.estTokens, 0),
    });
  }

  return folds.sort((a, b) => b.estTokens - a.estTokens || a.dir.localeCompare(b.dir));
}
