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

const GENERATED_DIR_NAMES = new Set([
  "dist",
  "build",
  "out",
  "coverage",
  "node_modules",
  ".next",
  "target",
  // A `generated/` tree is generated output by name. Not every such tree is
  // waste — see `isNecessaryGeneratedPath`, which exempts generated API
  // clients from the high-risk class without changing what they classify as.
  "generated",
  ".generated",
]);

const GENERATED_SUFFIXES = [".min.js", ".min.css", ".map", ".wasm"];

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

/**
 * Classify a path for Token Risk. Order: generated dir → Prisma client →
 * lockfile → generated suffix → source → config → unknown.
 */
export function classifyFiletype(filePath: string): FiletypeRiskClass {
  const segments = pathSegments(filePath);
  if (segments.some((segment) => GENERATED_DIR_NAMES.has(segment))) {
    return "generated";
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
  if (SOURCE_EXTENSIONS.has(ext)) {
    return "source";
  }
  if (CONFIG_EXTENSIONS.has(ext)) {
    return "config";
  }

  return "unknown";
}
