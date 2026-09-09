import {
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
} from "@tokenforge/risk-core";
/**
 * Managed-section merge for provider instruction markdown (#130).
 * HTML comments demarcate TokenForge content so developers can see what apply
 * produced; agents typically ignore HTML comments as structural noise.
 */

export {
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
} from "@tokenforge/risk-core";

/** Wrap lean instruction body in managed markers. */
export function wrapTokenForgeSection(body: string): string {
  const trimmed = body.replace(/^\uFEFF/, "").trimEnd();
  return `${TOKENFORGE_SECTION_BEGIN}\n${trimmed}\n${TOKENFORGE_SECTION_END}\n`;
}

export type MergeTokenForgeSectionResult = {
  contents: string;
  /** `create` when no prior file; `merge` when existing body was preserved. */
  disposition: "create" | "merge";
};

/**
 * Insert or replace the TokenForge-managed section in an instruction file.
 * - Missing file → create file with only the marked section.
 * - Existing with markers → replace that region (user text outside markers kept).
 * - Existing without markers → append a marked section after the prior body.
 */
export function mergeTokenForgeSection(
  existing: string | null | undefined,
  body: string,
): MergeTokenForgeSectionResult {
  const section = wrapTokenForgeSection(body);
  if (existing == null) {
    return { contents: section, disposition: "create" };
  }

  const beginIdx = existing.indexOf(TOKENFORGE_SECTION_BEGIN);
  const endIdx = existing.indexOf(TOKENFORGE_SECTION_END);

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    const before = existing.slice(0, beginIdx);
    const after = existing
      .slice(endIdx + TOKENFORGE_SECTION_END.length)
      .replace(/^\r?\n/, "");
    return { contents: `${before}${section}${after}`, disposition: "merge" };
  }

  if (beginIdx !== -1 && (endIdx === -1 || endIdx < beginIdx)) {
    // Malformed: begin without end — replace from begin through EOF.
    const before = existing.slice(0, beginIdx);
    return { contents: `${before}${section}`, disposition: "merge" };
  }

  const base = existing.replace(/^\uFEFF/, "").trimEnd();
  if (base.length === 0) {
    return { contents: section, disposition: "merge" };
  }
  return { contents: `${base}\n\n${section}`, disposition: "merge" };
}
