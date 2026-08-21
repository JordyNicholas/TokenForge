import type { FiletypeRiskClass, RiskAssessment } from "../domain/types";
import {
  DEFAULT_TOP_CANDIDATE_COUNT,
  INSTRUCTION_FILE_NAMES,
  INSTRUCTION_PATH_SEGMENTS,
  MIN_BORDERLINE_BYTES,
} from "../domain/constants";

export type EnrichmentCandidateOptions = {
  /** Max non-instruction paths from the largest-files bucket. */
  topCount?: number;
  /** Max candidates returned after dedupe and cap. */
  maxCandidates?: number;
};

function basename(path: string): string {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

/** True for AGENTS.md / CLAUDE.md / copilot-instructions / .cursor|rules paths. */
export function isInstructionPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const name = basename(normalized).toLowerCase();
  if (INSTRUCTION_FILE_NAMES.has(name)) {
    return true;
  }
  const segments = normalized.split("/").filter(Boolean);
  return segments.some((segment) => INSTRUCTION_PATH_SEGMENTS.has(segment.toLowerCase()));
}

function isBorderline(assessment: RiskAssessment): boolean {
  if (assessment.atRisk) {
    return false;
  }
  const borderlineClasses: FiletypeRiskClass[] = ["config", "unknown"];
  return (
    borderlineClasses.includes(assessment.fileClass) &&
    assessment.bytes >= MIN_BORDERLINE_BYTES
  );
}

function isEligibleForTopBucket(assessment: RiskAssessment): boolean {
  return assessment.fileClass !== "lockfile" && assessment.fileClass !== "generated";
}

/**
 * Pick paths for optional LLM enrichment. Order: instruction paths, borderline
 * configs, then largest eligible files. Caller applies byte/read caps at the CLI edge.
 */
export function selectEnrichmentCandidates(
  assessments: readonly RiskAssessment[],
  options: EnrichmentCandidateOptions = {},
): RiskAssessment[] {
  const topCount = options.topCount ?? DEFAULT_TOP_CANDIDATE_COUNT;
  const maxCandidates = options.maxCandidates ?? 30;

  const instruction = assessments.filter((assessment) => isInstructionPath(assessment.path));
  const borderline = assessments.filter(isBorderline);
  const topEligible = [...assessments]
    .filter(isEligibleForTopBucket)
    .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path))
    .slice(0, topCount);

  const seen = new Set<string>();
  const ordered = [...instruction, ...borderline, ...topEligible];
  const selected: RiskAssessment[] = [];

  for (const assessment of ordered) {
    if (seen.has(assessment.path)) {
      continue;
    }
    seen.add(assessment.path);
    selected.push(assessment);
    if (selected.length >= maxCandidates) {
      break;
    }
  }

  return selected;
}
