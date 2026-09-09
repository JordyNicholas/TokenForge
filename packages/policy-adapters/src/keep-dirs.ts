import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  STACK_MANIFEST_NAMES,
  classifyFiletype,
  detectStack,
  protectionFor,
  resolveDirectoryRoles,
  type DirectoryEntry,
  type DirectoryRoleAssignment,
  type StackProfile,
  type TokenRiskReport,
} from "@tokenforge/risk-core";

/** Directories the keep-content walker never enters. */
const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".tokenforge",
  ".idea",
  "coverage",
]);

/** Ephemeral subtrees under `.cursor/` that must not be walked. */
const CURSOR_EPHEMERAL_DIR_NAMES = new Set(["cache", "logs", "tmp"]);

function shouldSkipWalkDirectory(
  dirName: string,
  relativeParentDir: string,
): boolean {
  if (SKIP_DIR_NAMES.has(dirName)) {
    return true;
  }
  const parent =
    relativeParentDir.replaceAll("\\", "/").replace(/\/$/, "") || ".";
  if (parent === ".cursor" || parent.endsWith("/.cursor")) {
    return CURSOR_EPHEMERAL_DIR_NAMES.has(dirName);
  }
  return false;
}

/** Classes a policy glob must not hide from the agent that needs them. */
const KEPT_CLASSES = new Set(["source", "config"]);

/** Most Prefer roots worth naming before the line stops being readable. */
const MAX_SOURCE_ROOTS = 4;

/**
 * How deep a manifest or config file still speaks for the repo.
 *
 * Depth 2 reaches `packages/web/package.json` in a workspace without walking
 * the whole tree looking for manifests — and a `package.json` five levels down
 * is a vendored copy or a fixture, which must not decide the repo persona.
 */
const STACK_EVIDENCE_MAX_DEPTH = 2;

/** Hard ceiling on manifests read, so a pathological tree cannot stall the walk. */
const MAX_MANIFESTS_READ = 32;

/** Manifests larger than this are lockfile-shaped noise, not a dependency list. */
const MAX_MANIFEST_BYTES = 256 * 1024;

/**
 * File basenames kept per directory for role resolution.
 *
 * Roles need an extension histogram, a handful of stems (`page.tsx`), and three
 * sample files. None of that gets better past a few dozen names, and an asset
 * directory with 900 entries should not cost 900 strings to say "media".
 */
const MAX_FILE_NAMES_PER_DIR = 64;

export type KeptContent = {
  /** Directories holding kept content; a glob is never widened to one. */
  keepDirs: Set<string>;
  /** Top-level directories holding living source, busiest first. */
  sourceRoots: string[];
  /**
   * What the repo is built with, for the reasoning-pack persona (F26).
   * Always present; `confidence: "none"` when there was nothing to read.
   */
  stackProfile: StackProfile;
  /**
   * Directories the reasoning pack has a rule for, with the disambiguation
   * signal that settled each one and up to three sample files.
   */
  directoryRoles: DirectoryRoleAssignment[];
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

function depthOf(path: string): number {
  return path.split("/").filter(Boolean).length;
}

/**
 * Directories holding a path the policy pack keeps — source, config, or a
 * protected contract — that is not itself excluded, plus the stack and
 * directory-role evidence the reasoning pack needs.
 *
 * One walk serves all four outputs. The reasoning-pack fields are attested here
 * rather than persisted on the Token Risk contract, for the same reason
 * `keepDirs` is (F14 #286, Option A): they are a rendering concern, and this
 * function also runs on reports it did not produce.
 *
 * Shared by CLI apply and Extension Compact rules so both surfaces pass the
 * same evidence into policy adapters.
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
  const sourceWeight = new Map<string, number>();

  /** Repo-relative paths at or above {@link STACK_EVIDENCE_MAX_DEPTH}. */
  const evidencePaths: string[] = [];
  /** Repo-relative manifest path → content, read lazily after the walk. */
  const manifestPaths: string[] = [];
  /** Directory → basenames of the non-excluded files directly inside it. */
  const filesByDir = new Map<string, string[]>();

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
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

      // Reasoning-pack evidence. Excluded paths are already skipped above, so a
      // sample file can never name something the pack tells the agent to ignore.
      if (relativeDir !== "") {
        const names = filesByDir.get(relativeDir) ?? [];
        if (names.length < MAX_FILE_NAMES_PER_DIR) {
          names.push(entry.name);
          filesByDir.set(relativeDir, names);
        }
      }
      if (depthOf(path) <= STACK_EVIDENCE_MAX_DEPTH) {
        evidencePaths.push(path);
        if (
          STACK_MANIFEST_NAMES.has(entry.name) &&
          manifestPaths.length < MAX_MANIFESTS_READ
        ) {
          manifestPaths.push(path);
        }
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
      const top = ancestors[0];
      if (fileClass === "source" && top !== undefined) {
        sourceWeight.set(top, (sourceWeight.get(top) ?? 0) + 1);
      }
    }
  }

  await walk(rootResolved);

  const sourceRoots = [...sourceWeight.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_SOURCE_ROOTS)
    .map(([dir]) => dir);

  const stackProfile = detectStack({
    manifests: await readManifests(rootResolved, manifestPaths),
    paths: evidencePaths,
  });

  const directories: DirectoryEntry[] = [...filesByDir.entries()]
    .map(([dir, fileNames]) => ({ dir, fileNames }))
    .sort((a, b) => a.dir.localeCompare(b.dir));

  const directoryRoles = resolveDirectoryRoles({
    directories,
    stack: stackProfile,
    sourceRoots,
  });

  return { keepDirs, sourceRoots, stackProfile, directoryRoles };
}

/**
 * Manifest bodies for {@link detectStack}.
 *
 * A manifest that cannot be read, or that is too large to be a dependency list,
 * is simply absent — the detector reports lower confidence rather than failing,
 * so an unreadable `package.json` costs the persona a claim, not the run.
 */
async function readManifests(
  rootResolved: string,
  paths: readonly string[],
): Promise<Map<string, string>> {
  const manifests = new Map<string, string>();
  for (const path of paths) {
    try {
      const content = await readFile(join(rootResolved, path), "utf8");
      if (content.length <= MAX_MANIFEST_BYTES) {
        manifests.set(path, content);
      }
    } catch {
      // Unreadable manifest: evidence we do not have, not a failure.
    }
  }
  return manifests;
}
