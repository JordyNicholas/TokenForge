import { existsSync } from "node:fs";
import { join } from "node:path";

export type MonorepoHint = {
  packageRoot: string;
  note: string;
};

const MANIFESTS = ["package.json", "go.mod", "pom.xml", "Cargo.toml"];

/** Infer active package root from editor-relative path for scoped Discover advice. */
export function monorepoScopeHint(root: string, editorRelPath: string): MonorepoHint | undefined {
  const parts = editorRelPath.replaceAll("\\", "/").split("/");
  for (let i = parts.length; i >= 1; i -= 1) {
    const dir = parts.slice(0, i).join("/");
    for (const manifest of MANIFESTS) {
      const candidate = dir.length > 0 ? join(root, dir, manifest) : join(root, manifest);
      if (existsSync(candidate)) {
        const pkgRoot = dir.length > 0 ? dir : ".";
        return {
          packageRoot: pkgRoot,
          note: `Active package ${pkgRoot} — scope rule changes to this package when possible.`,
        };
      }
    }
  }
  return undefined;
}
