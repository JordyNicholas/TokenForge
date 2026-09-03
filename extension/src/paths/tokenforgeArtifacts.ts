/** Paths under `.tokenforge/` are extension exports — not session context. */
export function isTokenforgeArtifactPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  return normalized === ".tokenforge" || normalized.startsWith(".tokenforge/");
}
