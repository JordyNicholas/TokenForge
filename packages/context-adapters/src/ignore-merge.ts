export const TOKENFORGE_IGNORE_BEGIN = "# tokenforge:session-shield:begin";
export const TOKENFORGE_IGNORE_END = "# tokenforge:session-shield:end";

/** Normalize a repo path into a gitignore-style pattern (forward slashes, no leading `./`). */
export function normalizeIgnorePattern(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function buildManagedSection(patterns: readonly string[]): string {
  return [TOKENFORGE_IGNORE_BEGIN, ...patterns, TOKENFORGE_IGNORE_END].join("\n");
}

function parseManagedPatterns(sectionContent: string): string[] {
  return sectionContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function joinSections(before: string, section: string, after: string): string {
  const parts: string[] = [];
  if (before.length > 0) {
    parts.push(before);
  }
  parts.push(section);
  if (after.length > 0) {
    parts.push(after);
  }
  return `${parts.join("\n\n")}\n`;
}

/**
 * Merge gitignore-style patterns into the TokenForge-managed section of an ignore file.
 * Creates the managed section when absent; deduplicates patterns within the section.
 */
export function mergeIgnoreSection(
  existing: string,
  patterns: readonly string[],
): string {
  const normalized = [
    ...new Set(patterns.map(normalizeIgnorePattern).filter(Boolean)),
  ].sort();

  const beginIdx = existing.indexOf(TOKENFORGE_IGNORE_BEGIN);
  const endIdx = existing.indexOf(TOKENFORGE_IGNORE_END);

  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    const section = buildManagedSection(normalized);
    const trimmed = existing.trimEnd();
    if (trimmed.length === 0) {
      return `${section}\n`;
    }
    return `${trimmed}\n\n${section}\n`;
  }

  const before = existing.slice(0, beginIdx).trimEnd();
  const after = existing.slice(endIdx + TOKENFORGE_IGNORE_END.length).trimStart();
  const sectionContent = existing.slice(
    beginIdx + TOKENFORGE_IGNORE_BEGIN.length,
    endIdx,
  );
  const existingPatterns = parseManagedPatterns(sectionContent);
  const merged = [
    ...new Set([...existingPatterns, ...normalized]),
  ].sort();

  return joinSections(before, buildManagedSection(merged), after);
}

/**
 * Remove one path from the TokenForge-managed ignore section.
 * Drops the entire managed section when it becomes empty.
 */
export function removePathFromIgnoreSection(existing: string, path: string): string {
  const normalized = normalizeIgnorePattern(path);
  const beginIdx = existing.indexOf(TOKENFORGE_IGNORE_BEGIN);
  const endIdx = existing.indexOf(TOKENFORGE_IGNORE_END);

  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return existing;
  }

  const before = existing.slice(0, beginIdx).trimEnd();
  const after = existing.slice(endIdx + TOKENFORGE_IGNORE_END.length).trimStart();
  const sectionContent = existing.slice(
    beginIdx + TOKENFORGE_IGNORE_BEGIN.length,
    endIdx,
  );
  const remaining = parseManagedPatterns(sectionContent).filter(
    (pattern) => pattern !== normalized,
  );

  if (remaining.length === 0) {
    const parts: string[] = [];
    if (before.length > 0) {
      parts.push(before);
    }
    if (after.length > 0) {
      parts.push(after);
    }
    return parts.length === 0 ? "" : `${parts.join("\n\n")}\n`;
  }

  return joinSections(before, buildManagedSection(remaining), after);
}
