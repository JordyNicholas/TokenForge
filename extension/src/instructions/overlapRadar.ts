import { isInstructionPath } from "@tokenforge/risk-core";
import type { TrackedTab } from "../tabs/types";

export type OverlapHint = {
  path: string;
  overlapsWith: string;
  note: string;
};

/** Heuristic overlap: instruction paths that share basename with open tabs. */
export function detectInstructionOverlap(
  tabs: readonly TrackedTab[],
  instructionPaths: readonly string[],
): OverlapHint[] {
  const hints: OverlapHint[] = [];
  const tabPaths = new Set(tabs.map((t) => t.path));

  for (const instr of instructionPaths) {
    if (!isInstructionPath(instr)) {
      continue;
    }
    const base = instr.split(/[/\\]/).pop() ?? instr;
    for (const tabPath of tabPaths) {
      if (tabPath === instr) {
        continue;
      }
      if (tabPath.endsWith(base)) {
        hints.push({
          path: instr,
          overlapsWith: tabPath,
          note: "Rule file and open tab share naming — review for redundant agent context.",
        });
      }
    }
  }

  return hints.slice(0, 8);
}
