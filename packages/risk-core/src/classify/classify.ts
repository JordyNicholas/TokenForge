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

/**
 * Classify a path for Token Risk. Order: generated dir → lockfile →
 * generated suffix → source → config → unknown.
 */
export function classifyFiletype(filePath: string): FiletypeRiskClass {
  const segments = pathSegments(filePath);
  if (segments.some((segment) => GENERATED_DIR_NAMES.has(segment))) {
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
