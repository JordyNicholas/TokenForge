/** Minimum times the same normalized paragraph must repeat to flag bloat. */
export const MIN_INSTRUCTION_PARAGRAPH_REPEATS = 3;

/** Soft budget for always-on instruction stack tokens (heuristic audit). */
export const RECOMMENDED_INSTRUCTION_STACK_TOKENS = 4_096;

function normalizeParagraph(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Split markdown-ish text into paragraphs (blank-line separated blocks).
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(normalizeParagraph)
    .filter((block) => block.length >= 40);
}

/**
 * Highest repeat count of any paragraph block in `text`.
 */
export function maxParagraphRepeatCount(text: string): number {
  const counts = new Map<string, number>();
  for (const paragraph of splitParagraphs(text)) {
    counts.set(paragraph, (counts.get(paragraph) ?? 0) + 1);
  }
  let max = 0;
  for (const count of counts.values()) {
    max = Math.max(max, count);
  }
  return max;
}

export function hasInstructionRepetition(text: string): boolean {
  return maxParagraphRepeatCount(text) >= MIN_INSTRUCTION_PARAGRAPH_REPEATS;
}
