import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  isInstructionPath,
  scoreRisk,
  selectEnrichmentCandidates,
  type RiskAssessment,
} from "@tokenforge/risk-core";
import type { TrackedTab } from "../tabs/types";

const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".tokenforge",
  "coverage",
  ".next",
  "vendor",
]);

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

async function walkInstructionFiles(root: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const rel = toPosix(relative(root, abs));
      if (isInstructionPath(rel)) {
        found.push(rel);
      }
    }
  }

  await walk(root);
  return found;
}

/**
 * Build assessments for instruction paths from open tabs + workspace walk,
 * then run risk-core candidate selection (instruction-first).
 */
export async function collectInstructionCandidates(
  root: string,
  tabs: readonly TrackedTab[],
): Promise<RiskAssessment[]> {
  const byPath = new Map<string, RiskAssessment>();

  for (const tab of tabs) {
    if (!isInstructionPath(tab.path)) {
      continue;
    }
    byPath.set(tab.path, tab.assessment);
  }

  const walked = await walkInstructionFiles(root);
  for (const path of walked) {
    if (byPath.has(path)) {
      continue;
    }
    try {
      const bytes = (await stat(join(root, path))).size;
      byPath.set(path, scoreRisk({ path, bytes, inactiveMs: 0 }));
    } catch {
      /* skip unreadable */
    }
  }

  const assessments = [...byPath.values()];
  // topCount 0 is the deliberate part: the extension enriches instruction paths
  // only. maxCandidates is left to risk-core's enforced default rather than
  // restated here, so the extension cannot drift from the CLI.
  return selectEnrichmentCandidates(assessments, { topCount: 0 }).filter(
    (assessment) => isInstructionPath(assessment.path),
  );
}
