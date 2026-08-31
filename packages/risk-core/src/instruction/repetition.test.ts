import { describe, expect, it } from "vitest";
import {
  hasInstructionRepetition,
  maxParagraphRepeatCount,
  MIN_INSTRUCTION_PARAGRAPH_REPEATS,
  splitParagraphs,
} from "./repetition";

describe("instruction repetition heuristics", () => {
  const block =
    "Always run the full test suite before committing. Always write clear commit messages.";

  it("detects repeated paragraph blocks", () => {
    const repeated = Array.from({ length: MIN_INSTRUCTION_PARAGRAPH_REPEATS }, () => block).join(
      "\n\n",
    );
    expect(splitParagraphs(repeated)).toHaveLength(1);
    expect(maxParagraphRepeatCount(repeated)).toBe(MIN_INSTRUCTION_PARAGRAPH_REPEATS);
    expect(hasInstructionRepetition(repeated)).toBe(true);
  });

  it("ignores short or single-copy paragraphs", () => {
    expect(hasInstructionRepetition("Keep it short.")).toBe(false);
    expect(hasInstructionRepetition(`${block}\n\n${block}`)).toBe(false);
  });
});
