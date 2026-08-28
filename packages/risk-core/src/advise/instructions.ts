import { MAX_LEAN_INSTRUCTION_BYTES } from "../domain/constants";
import type {
  FiletypeRiskClass,
  TokenRiskFinding,
  TokenRiskReport,
} from "../domain/types";
import { classifyFiletype } from "../classify/classify";
import { resolveSuggestion } from "../advise/suggest";
import { activePathSet, isActivePath } from "../policy/active";
import { collapseExclusionPaths } from "../policy/collapse";

export type SynthesizeLeanInstructionsOptions = {
  /** Markdown H1 title line without leading `# `. */
  title?: string;
  /** Soft byte budget; synthesizer trims sections to stay under this. */
  maxBytes?: number;
};

const HYGIENE_KINDS = new Set(["trim_instructions", "dedupe_rules"]);
const MAX_HYGIENE_SUMMARY_CHARS = 120;
const MAX_WHY_THEMES = 3;
const MAX_EXCLUDE_BULLETS = 24;
const MAX_HYGIENE_BULLETS = 8;

const COMPACT_OUTPUT_FILE_CLASSES: ReadonlySet<FiletypeRiskClass> = new Set([
  "test_output",
  "ci_log",
  "build_artifact",
]);

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

function truncateSummary(summary: string, max = MAX_HYGIENE_SUMMARY_CHARS): string {
  const trimmed = summary.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function excludedPathsForInstructions(
  findings: readonly TokenRiskFinding[],
  active: ReadonlySet<string>,
): string[] {
  const ordered = [...findings]
    .filter(
      (finding) =>
        finding.action === "excluded" && !isActivePath(active, finding.path),
    )
    .sort(
      (a, b) =>
        b.estTokens - a.estTokens || a.path.localeCompare(b.path),
    );
  const paths = ordered.map((finding) => finding.path);
  return collapseExclusionPaths(paths).slice(0, MAX_EXCLUDE_BULLETS);
}

type HygieneBullet = { path: string; summary: string; estTokens: number };

function hygieneBullets(
  findings: readonly TokenRiskFinding[],
): HygieneBullet[] {
  const byPath = new Map<string, HygieneBullet>();
  for (const finding of findings) {
    // redundant_config resolves to `dedupe_rules` too, but it is advice about
    // the repo's build config, not about agent instructions. This section is
    // written into the provider instruction file, so letting it through would
    // put developer refactoring notes in front of the agent every turn (#136).
    if (finding.reason === "redundant_config") {
      continue;
    }
    const suggestion = resolveSuggestion(finding);
    const isHygiene =
      HYGIENE_KINDS.has(suggestion.kind) ||
      finding.reason === "redundant_instructions";
    if (!isHygiene) {
      continue;
    }
    const next: HygieneBullet = {
      path: finding.path,
      summary: truncateSummary(suggestion.summary),
      estTokens: finding.estTokens,
    };
    const existing = byPath.get(finding.path);
    if (!existing || next.estTokens > existing.estTokens) {
      byPath.set(finding.path, next);
    }
  }
  return [...byPath.values()]
    .sort(
      (a, b) =>
        b.estTokens - a.estTokens || a.path.localeCompare(b.path),
    )
    .slice(0, MAX_HYGIENE_BULLETS);
}

function whyThemes(report: TokenRiskReport): string[] {
  const themes = report.scan?.llm?.analysisOverview?.themes ?? [];
  return themes
    .map((theme) => theme.trim())
    .filter((theme) => theme.length > 0)
    .slice(0, MAX_WHY_THEMES);
}

/** True when the scan flagged output-shape waste worth compact-output guidance (#172). */
export function shouldIncludeCompactOutputGuidance(
  findings: readonly TokenRiskFinding[],
): boolean {
  return findings.some((finding) => {
    if (finding.action !== "excluded" && finding.action !== "filtered") {
      return false;
    }
    return COMPACT_OUTPUT_FILE_CLASSES.has(classifyFiletype(finding.path));
  });
}

function compactOutputSection(): string {
  return [
    "## Compact tool output",
    "- For test and lint runs: share failing cases and counts — not full CI logs or coverage trees.",
    "- For build or docker output: cite the error line or exit code — not multi-page logs.",
    "- TokenForge does not intercept terminal output; this is prompt hygiene only.",
  ].join("\n");
}

function joinSections(sections: string[]): string {
  return `${sections.filter((section) => section.length > 0).join("\n\n")}\n`;
}

/**
 * Deterministic lean instructions markdown from a Token Risk report.
 * Uses combined/top-level findings (heuristic + LLM). No second LLM call.
 */
export function synthesizeLeanInstructions(
  report: TokenRiskReport,
  options: SynthesizeLeanInstructionsOptions = {},
): string {
  const title = options.title?.trim() || "TokenForge instructions";
  const maxBytes = options.maxBytes ?? MAX_LEAN_INSTRUCTION_BYTES;

  const header = [
    `# ${title}`,
    "",
    "Keep Chat/Agent context small. Prefer source over lockfiles, generated trees,",
    "and oversized dumps. Do not paste those files into the prompt.",
  ].join("\n");

  const prefer = [
    "## Prefer",
    "- Current source under `src/` (or living application source)",
    "- Short, living config — not legacy XML/JSON dumps",
    "",
    "This file is intentionally short. Do not append logs, lockfile excerpts, or",
    "vendor billing notes.",
  ].join("\n");

  // A "do not load" bullet naming the file its author has open is the exact
  // false positive #137 exists to prevent.
  const active = activePathSet(report);
  let excludeLines = excludedPathsForInstructions(report.findings, active).map(
    (path) => `- \`${path}\``,
  );
  let hygiene = hygieneBullets(report.findings);
  let themes = whyThemes(report);
  const includeCompactOutput = shouldIncludeCompactOutputGuidance(report.findings);

  const build = (): string => {
    const sections: string[] = [header];

    if (excludeLines.length > 0) {
      sections.push(["## Do not load", ...excludeLines].join("\n"));
    }

    if (hygiene.length > 0) {
      sections.push(
        [
          "## Instruction hygiene",
          ...hygiene.map(
            (item) => `- \`${item.path}\`: ${item.summary}`,
          ),
        ].join("\n"),
      );
    }

    if (includeCompactOutput) {
      sections.push(compactOutputSection());
    }

    sections.push(prefer);

    if (themes.length > 0) {
      sections.push(
        ["## Why", ...themes.map((theme) => `- ${theme}`)].join("\n"),
      );
    }

    return joinSections(sections);
  };

  let text = build();
  while (utf8Bytes(text) > maxBytes) {
    if (themes.length > 0) {
      themes = themes.slice(0, -1);
    } else if (hygiene.length > 0) {
      hygiene = hygiene.slice(0, -1);
    } else if (excludeLines.length > 0) {
      excludeLines = excludeLines.slice(0, -1);
    } else {
      // Extreme: trim by UTF-8 byte budget without splitting code points.
      const encoded = new TextEncoder().encode(text);
      let end = maxBytes;
      while (end > 0 && (encoded[end] & 0xc0) === 0x80) {
        end -= 1;
      }
      const sliced = new TextDecoder().decode(encoded.subarray(0, end));
      return sliced.endsWith("\n") ? sliced : `${sliced}\n`;
    }
    text = build();
  }

  return text;
}
