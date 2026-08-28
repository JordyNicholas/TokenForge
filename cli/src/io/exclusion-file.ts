/**
 * Parse `paths:` from a TokenForge exclusion YAML sidecar.
 * Intentionally minimal — only the list apply writes today.
 */
export function parseExclusionYaml(contents: string): string[] {
  const paths: string[] = [];
  let inPaths = false;

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.length === 0) {
      continue;
    }
    if (trimmed === "paths:") {
      inPaths = true;
      continue;
    }
    if (!inPaths) {
      continue;
    }
    if (trimmed.startsWith("- ")) {
      paths.push(trimmed.slice(2).trim());
      continue;
    }
    if (trimmed === "[]") {
      continue;
    }
    break;
  }

  return paths;
}
