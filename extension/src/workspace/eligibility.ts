import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** Root-level files that indicate a code project (any one is enough with `auto`). */
export const PROJECT_ROOT_MARKERS = [
  "package.json",
  "pnpm-workspace.yaml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "Pipfile",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
  "mix.exs",
  "CMakeLists.txt",
] as const;

export type WorkspaceMode = "auto" | "always" | "git-only" | "manifest-only";

export function hasGitRepository(root: string): boolean {
  const gitPath = join(root, ".git");
  if (!existsSync(gitPath)) {
    return false;
  }
  try {
    const stat = statSync(gitPath);
    if (stat.isFile()) {
      return true;
    }
    return stat.isDirectory() && existsSync(join(gitPath, "HEAD"));
  } catch {
    return false;
  }
}

export function hasProjectMarker(root: string): boolean {
  return PROJECT_ROOT_MARKERS.some((marker) => existsSync(join(root, marker)));
}

export function isEligibleWorkspaceRoot(
  root: string,
  mode: WorkspaceMode,
): boolean {
  if (mode === "always") {
    return true;
  }
  const git = hasGitRepository(root);
  const manifest = hasProjectMarker(root);
  if (mode === "git-only") {
    return git;
  }
  if (mode === "manifest-only") {
    return manifest;
  }
  return git || manifest;
}
