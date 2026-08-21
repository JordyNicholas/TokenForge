/** Display helpers for Prove privacy (screen-share redaction). */

export function displayPath(path: string, redact: boolean): string {
  if (!redact) {
    return path;
  }
  const parts = path.split(/[/\\]/);
  const base = parts[parts.length - 1];
  return base && base.length > 0 ? base : path;
}

export function isDemoSourceLabel(sourceLabel: string): boolean {
  return sourceLabel === "/demo-seed.json" || sourceLabel.endsWith("/demo-seed.json");
}
