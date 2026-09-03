import {
  BUILD_ARTIFACT_DIR_NAMES,
  BUILD_ARTIFACT_EXTENSIONS,
  CI_LOG_BASENAMES,
  CI_LOG_DIR_NAMES,
  GENERATED_TREE_DIR_NAMES,
  MEDIA_EXTENSIONS,
  TEST_OUTPUT_DIR_NAMES,
} from "../domain/constants";
import type { FiletypeRiskClass } from "../domain/types";

const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "Gemfile.lock",
  "poetry.lock",
  "composer.lock",
  "go.sum",
  "flake.lock",
  "Pipfile.lock",
  "pdm.lock",
]);

const GENERATED_SUFFIXES = [".min.js", ".min.css", ".map"];

const SOURCE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".go",
  ".h",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".mjs",
  ".cjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".swift",
  ".ts",
  ".tsx",
]);

const CONFIG_EXTENSIONS = new Set([
  ".env",
  ".ini",
  ".json",
  ".toml",
  ".xml",
  ".yaml",
  ".yml",
]);

export function pathSegments(filePath: string): string[] {
  return filePath.replaceAll("\\", "/").split("/").filter(Boolean);
}

export function fileName(filePath: string): string {
  const segments = pathSegments(filePath);
  return segments[segments.length - 1] ?? filePath;
}

function extensionOf(name: string): string {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot === -1 ? "" : lower.slice(dot);
}

function hasDirSegment(segments: readonly string[], names: ReadonlySet<string>): boolean {
  return segments.some((segment) => names.has(segment));
}

function isPrismaishDir(segment: string): boolean {
  const lower = segment.toLowerCase();
  return lower.includes("prisma") || lower === "database" || lower === "db";
}

/**
 * True for Prisma-generated client trees (default and common custom outputs).
 * Requires `.prisma`, `prisma/generated`, or files under
 * `(database|db|*prisma*)/client/**`.
 */
export function isPrismaGeneratedPath(filePath: string): boolean {
  const segments = pathSegments(filePath);
  if (segments.some((segment) => segment === ".prisma")) {
    return true;
  }

  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index]!.toLowerCase();
    const next = segments[index + 1]!.toLowerCase();
    if (current === "prisma" && next === "generated") {
      return true;
    }
    if (current === "generated" && next === "prisma") {
      return true;
    }
  }

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (!isPrismaishDir(segments[index]!)) {
      continue;
    }
    const clientIndex = segments.findIndex(
      (segment, offset) =>
        offset > index && segment.toLowerCase() === "client",
    );
    // Must be a file (or nested path) under that client directory.
    if (clientIndex >= 0 && clientIndex < segments.length - 1) {
      return true;
    }
  }

  return false;
}

/** True for CI / pipeline log files by basename or parent directory. */
export function isCiLogPath(filePath: string): boolean {
  const segments = pathSegments(filePath);
  const name = fileName(filePath).toLowerCase();
  if (!name.endsWith(".log")) {
    return false;
  }
  if (CI_LOG_BASENAMES.has(name)) {
    return true;
  }
  return segments
    .slice(0, -1)
    .some((segment) => CI_LOG_DIR_NAMES.has(segment.toLowerCase()));
}

/**
 * Classify a path for Token Risk. Order: output-shape dirs → CI logs →
 * Prisma client → lockfile → suffixes → artifacts → media → source → config
 * → unknown.
 */
export function classifyFiletype(filePath: string): FiletypeRiskClass {
  const segments = pathSegments(filePath);
  if (hasDirSegment(segments, TEST_OUTPUT_DIR_NAMES)) {
    return "test_output";
  }
  if (hasDirSegment(segments, BUILD_ARTIFACT_DIR_NAMES)) {
    return "build_artifact";
  }
  if (hasDirSegment(segments, GENERATED_TREE_DIR_NAMES)) {
    return "generated";
  }

  if (isCiLogPath(filePath)) {
    return "ci_log";
  }

  if (isPrismaGeneratedPath(filePath)) {
    return "generated";
  }

  const name = fileName(filePath);
  if (LOCKFILE_NAMES.has(name)) {
    return "lockfile";
  }

  const lower = name.toLowerCase();
  if (GENERATED_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return "generated";
  }

  const ext = extensionOf(name);
  if (BUILD_ARTIFACT_EXTENSIONS.has(ext)) {
    return "build_artifact";
  }
  // After the output-shape dirs and artifact extensions, so `dist/logo.png`
  // stays `build_artifact` and keeps that copy; before source, because `.svg`
  // must not fall through to the config/unknown tail.
  if (MEDIA_EXTENSIONS.has(ext)) {
    return "media";
  }
  if (SOURCE_EXTENSIONS.has(ext)) {
    return "source";
  }
  if (CONFIG_EXTENSIONS.has(ext)) {
    return "config";
  }

  return "unknown";
}
