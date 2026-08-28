import type { FiletypeRiskClass, RiskAssessment } from "../domain/types";
import {
  DEFAULT_REPEATED_CONFIG_COUNT,
  DEFAULT_SOURCE_CANDIDATE_COUNT,
  DEFAULT_TOP_CANDIDATE_COUNT,
  HIGH_RISK_FILE_CLASSES,
  INSTRUCTION_FILE_NAMES,
  INSTRUCTION_PATH_SEGMENTS,
  MIN_BORDERLINE_BYTES,
} from "../domain/constants";
import { classifyFiletype } from "../classify/classify";
import { isSecretPath } from "../protect/protect";

export type EnrichmentCandidateOptions = {
  /** Max non-instruction paths from the largest-files bucket. */
  topCount?: number;
  /** Max `source`-class paths from the source-fairness bucket (see B8). */
  sourceTopCount?: number;
  /** Max paths from the repeated-config bucket (see #136). */
  repeatedConfigCount?: number;
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

function parentDir(path: string): string {
  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  return segments.slice(0, -1).join("/");
}

/**
 * Config basenames appearing in 2+ distinct directories — the shape of a
 * per-package config copied instead of extended from a shared base.
 *
 * Derived from the path list alone; no workspace manifest is read, so this
 * works for any layout that repeats a config name. It is deliberately a weak
 * signal: `package.json` recurs in every monorepo and is *not* redundant.
 * Whether the copies actually duplicate each other is a semantic question,
 * which is why this only routes paths to the hybrid pass and never produces a
 * finding on its own.
 */
export function repeatedConfigBasenames(
  paths: readonly string[],
): Set<string> {
  const dirsByName = new Map<string, Set<string>>();
  for (const path of paths) {
    if (classifyFiletype(path) !== "config") {
      continue;
    }
    const name = basename(path).toLowerCase();
    const dirs = dirsByName.get(name) ?? new Set<string>();
    dirs.add(parentDir(path));
    dirsByName.set(name, dirs);
  }

  const repeated = new Set<string>();
  for (const [name, dirs] of dirsByName) {
    if (dirs.size >= 2) {
      repeated.add(name);
    }
  }
  return repeated;
}

/**
 * Repeated configs, largest group first, until `limit`.
 *
 * A group may be truncated but never reduced below two members: the enricher
 * can only call configs redundant by comparing them against each other, so one
 * lone copy is a wasted slot. Truncation is fine — comparing 8 of a monorepo's
 * 40 `package.json` files still answers the question.
 */
function repeatedConfigCandidates(
  assessments: readonly RiskAssessment[],
  limit: number,
): RiskAssessment[] {
  if (limit <= 0) {
    return [];
  }
  const repeated = repeatedConfigBasenames(
    assessments.map((assessment) => assessment.path),
  );
  if (repeated.size === 0) {
    return [];
  }

  const groups = new Map<string, RiskAssessment[]>();
  for (const assessment of assessments) {
    const name = basename(assessment.path).toLowerCase();
    if (!repeated.has(name)) {
      continue;
    }
    groups.set(name, [...(groups.get(name) ?? []), assessment]);
  }

  const ordered = [...groups.entries()].sort(
    ([nameA, a], [nameB, b]) => b.length - a.length || nameA.localeCompare(nameB),
  );

  const selected: RiskAssessment[] = [];
  for (const [, group] of ordered) {
    const room = limit - selected.length;
    // Fewer than two slots left cannot host a comparison, so stop rather than
    // spend the last slot on an unpairable copy.
    if (room < 2) {
      break;
    }
    selected.push(
      ...[...group]
        .sort((a, b) => a.path.localeCompare(b.path))
        .slice(0, room),
    );
  }
  return selected;
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
  return !HIGH_RISK_FILE_CLASSES.has(assessment.fileClass);
}

/**
 * Pick paths for optional LLM enrichment. Order: instruction paths, a
 * guaranteed `source`-class sample, repeated per-package configs, borderline
 * configs, then largest eligible files. Caller applies byte/read caps at the
 * CLI edge.
 *
 * Credential-shaped paths are dropped up front and can never be selected.
 */
export function selectEnrichmentCandidates(
  allAssessments: readonly RiskAssessment[],
  options: EnrichmentCandidateOptions = {},
): RiskAssessment[] {
  const topCount = options.topCount ?? DEFAULT_TOP_CANDIDATE_COUNT;
  const sourceTopCount = options.sourceTopCount ?? DEFAULT_SOURCE_CANDIDATE_COUNT;
  const repeatedConfigCount =
    options.repeatedConfigCount ?? DEFAULT_REPEATED_CONFIG_COUNT;
  const maxCandidates = options.maxCandidates ?? 30;

  // Runs before every bucket, not as a filter on the result: a credential-
  // shaped path must never reach an enricher, and hybrid mode may send
  // excerpts to an external backend. Asking a remote model whether a file
  // holds a secret leaks the secret either way.
  const assessments = allAssessments.filter(
    (assessment) => !isSecretPath(assessment.path),
  );

  const instruction = assessments.filter((assessment) => isInstructionPath(assessment.path));
  // Ranked within its own class (no byte floor) so small utility files don't
  // have to out-compete every other file class for a spot — see B8.
  const topSourceEligible = assessments
    .filter((assessment) => assessment.fileClass === "source")
    .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path))
    .slice(0, sourceTopCount);
  // Independent of MIN_BORDERLINE_BYTES: a per-package tsconfig.json is a few
  // hundred bytes, so the borderline floor would never let one through, and
  // the top-files bucket ranks by size — the exact axis on which these are
  // uninteresting. Redundancy is about how many copies exist, not how big
  // each one is (#136).
  const repeatedConfig = repeatedConfigCandidates(assessments, repeatedConfigCount);
  const borderline = assessments.filter(isBorderline);
  const topEligible = [...assessments]
    .filter(isEligibleForTopBucket)
    .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path))
    .slice(0, topCount);

  const seen = new Set<string>();
  // topSourceEligible and repeatedConfig both come before the (per B4,
  // uncapped) borderline bucket so a repo with many mid-size config files
  // can't crowd them out before the global cap is reached.
  const ordered = [
    ...instruction,
    ...topSourceEligible,
    ...repeatedConfig,
    ...borderline,
    ...topEligible,
  ];
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
