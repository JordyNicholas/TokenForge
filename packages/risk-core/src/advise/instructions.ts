import { MAX_LEAN_INSTRUCTION_BYTES } from "../domain/constants";
import type {
  FiletypeRiskClass,
  TokenRiskFinding,
  TokenRiskReport,
} from "../domain/types";
import { classifyFiletype } from "../classify/classify";
import { resolveSuggestion } from "../advise/suggest";
import {
  WASTE_KIND_LABEL,
  dominantWasteKinds,
  joinLabels,
  wasteKindFor,
  type WasteKind,
} from "./kinds";
import { activePathSet, isActivePath } from "../policy/active";
import { isPathCoveredByExclusion } from "../policy/exclusions";
import { collapseExclusionPaths, type CollapseOptions } from "../policy/collapse";
import { isInstructionStackOverBudget } from "../instruction/budget";

export type SynthesizeLeanInstructionsOptions = {
  /** Markdown H1 title line without leading `# `. */
  title?: string;
  /** Soft byte budget; synthesizer trims sections to stay under this. */
  maxBytes?: number;
  /** When true, do not truncate hygiene/advisory summaries at 120 chars. */
  completeSummaries?: boolean;
  /** Directories a "do not load" glob must never widen to — see {@link CollapseOptions}. */
  keepDirs?: ReadonlySet<string>;
  /** Top-level directories holding living source, for the Prefer section. */
  sourceRoots?: readonly string[];
};

const HYGIENE_KINDS = new Set(["trim_instructions", "dedupe_rules"]);
const MAX_HYGIENE_SUMMARY_CHARS = 120;
const COMPLETE_HYGIENE_SUMMARY_CHARS = 480;
const MAX_WHY_THEMES = 3;
const MAX_PREFER_ROOTS = 4;
const MAX_EXCLUDE_BULLETS = 24;
const MAX_HYGIENE_BULLETS = 8;
const MAX_ADVISORY_BULLETS = 6;
const ADVISORY_REASONS = new Set<TokenRiskFinding["reason"]>([
  "duplicate_logic",
  "redundant_config",
]);

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

type ExcludeEntry = {
  glob: string;
  kind: WasteKind;
};

/**
 * Excluded globs tagged with the kind of waste they hold.
 *
 * A collapsed glob has no extension of its own, so it is tagged from the
 * findings it covers — heaviest kind wins. The weights decide the tag and then
 * stay here; the rendered file names a bucket, never a count.
 */
function excludedEntriesForInstructions(
  findings: readonly TokenRiskFinding[],
  active: ReadonlySet<string>,
  collapse: CollapseOptions = {},
): ExcludeEntry[] {
  const ordered = [...findings]
    .filter(
      (finding) =>
        finding.action === "excluded" && !isActivePath(active, finding.path),
    )
    .sort(
      (a, b) =>
        b.estTokens - a.estTokens || a.path.localeCompare(b.path),
    );
  const globs = collapseExclusionPaths(
    ordered.map((finding) => finding.path),
    collapse,
  ).slice(0, MAX_EXCLUDE_BULLETS);

  return globs.map((glob) => {
    const weight = new Map<WasteKind, number>();
    for (const finding of ordered) {
      if (!isPathCoveredByExclusion(finding.path, [glob])) {
        continue;
      }
      const kind = wasteKindFor(finding.path);
      weight.set(kind, (weight.get(kind) ?? 0) + finding.estTokens);
    }
    const kind =
      [...weight.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0]?.[0] ?? wasteKindFor(glob);
    return { glob, kind };
  });
}

/** Heading each bucket renders under, in the order they appear. */
const EXCLUDE_SECTIONS: ReadonlyArray<{ kind: WasteKind; heading: string }> = [
  { kind: "binary", heading: "## Do not load — binary assets" },
  { kind: "dump", heading: "## Do not load — lockfiles and data dumps" },
  { kind: "output", heading: "## Do not load — build and CI output" },
  {
    kind: "prose",
    heading: "## Read a section on demand — do not paste whole",
  },
];

function excludeSections(entries: readonly ExcludeEntry[]): string[] {
  const sections: string[] = [];
  for (const { kind, heading } of EXCLUDE_SECTIONS) {
    const lines = entries
      .filter((entry) => entry.kind === kind)
      .map((entry) => `- \`${entry.glob}\``);
    if (lines.length > 0) {
      sections.push([heading, ...lines].join("\n"));
    }
  }
  if (sections.length > 0) {
    sections.push(
      "If a task truly needs one of these, open that single file — do not pull the\ndirectory into context.",
    );
  }
  return sections;
}

type HygieneBullet = {
  path: string;
  summary: string;
  estTokens: number;
  confidence: number;
};

type AdvisoryBullet = HygieneBullet;

function isAdvisoryFinding(finding: TokenRiskFinding): boolean {
  if (finding.action !== "kept") {
    return false;
  }
  if (ADVISORY_REASONS.has(finding.reason)) {
    return true;
  }
  const kind = resolveSuggestion(finding).kind;
  return kind === "review" || kind === "consolidate_duplicates";
}

function hygieneBullets(
  findings: readonly TokenRiskFinding[],
  summaryMaxChars: number,
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
      summary: truncateSummary(suggestion.summary, summaryMaxChars),
      estTokens: finding.estTokens,
      confidence: finding.confidence ?? 0,
    };
    const existing = byPath.get(finding.path);
    if (!existing || next.estTokens > existing.estTokens) {
      byPath.set(finding.path, next);
    }
  }
  return [...byPath.values()]
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        b.estTokens - a.estTokens ||
        a.path.localeCompare(b.path),
    )
    .slice(0, MAX_HYGIENE_BULLETS);
}

function advisoryBullets(
  findings: readonly TokenRiskFinding[],
  summaryMaxChars: number,
): AdvisoryBullet[] {
  const byPath = new Map<string, AdvisoryBullet>();
  for (const finding of findings) {
    if (!isAdvisoryFinding(finding)) {
      continue;
    }
    const suggestion = resolveSuggestion(finding);
    const next: AdvisoryBullet = {
      path: finding.path,
      summary: truncateSummary(suggestion.summary, summaryMaxChars),
      estTokens: finding.estTokens,
      confidence: finding.confidence ?? 0,
    };
    const existing = byPath.get(finding.path);
    if (
      !existing ||
      next.confidence > existing.confidence ||
      (next.confidence === existing.confidence &&
        next.estTokens > existing.estTokens)
    ) {
      byPath.set(finding.path, next);
    }
  }
  return [...byPath.values()]
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        b.estTokens - a.estTokens ||
        a.path.localeCompare(b.path),
    )
    .slice(0, MAX_ADVISORY_BULLETS);
}

/**
 * Opening lines, named from what this scan actually found.
 *
 * The template this replaces recited "lockfiles, generated trees, and oversized
 * dumps" everywhere. On a repo whose bleed is images and two data dumps that
 * names three categories the scan never flagged, and teaches the agent nothing
 * about where the weight really is.
 */
function introLines(report: TokenRiskReport): string[] {
  const kinds = dominantWasteKinds(report.findings);
  if (kinds.length === 0) {
    return [
      "Keep Chat/Agent context small. Prefer living source over generated and",
      "oversized files. Do not paste those into the prompt.",
    ];
  }
  const labels = joinLabels(kinds.map((kind) => WASTE_KIND_LABEL[kind]));
  return [
    `Keep Chat/Agent context small. In this repo the weight is ${labels}.`,
    "Do not paste those files into the prompt.",
  ];
}

/**
 * Prefer roots the caller attested to, or the generic line when it could not.
 * Naming `src/` on a repo that has no `src/` is worse than saying nothing.
 */
function preferLines(sourceRoots: readonly string[] | undefined): string[] {
  const roots = (sourceRoots ?? []).filter((root) => root.length > 0);
  if (roots.length === 0) {
    return [
      "- Living application source over generated or vendored trees",
      "- Short, living config — not legacy XML/JSON dumps",
    ];
  }
  const named = roots
    .slice(0, MAX_PREFER_ROOTS)
    .map((root) => `\`${root}/\``)
    .join(", ");
  return [
    `- Living source under ${named}`,
    "- Short, living config — not the dumps listed above",
  ];
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

function instructionStackSection(report: TokenRiskReport): string | undefined {
  const budget = report.instructionBudget;
  if (!budget) {
    return undefined;
  }
  const lines = [
    "## Instruction stack",
    `- Always-on instruction files total ~${budget.alwaysOnTokens.toLocaleString()} est. tokens (recommended ≤ ${budget.recommendedMax.toLocaleString()}).`,
  ];
  if (isInstructionStackOverBudget(budget)) {
    lines.push(
      "- Trim or dedupe rules files — heuristic stack budget, not a repo edit.",
    );
  }
  return lines.join("\n");
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
  const summaryMaxChars = options.completeSummaries
    ? COMPLETE_HYGIENE_SUMMARY_CHARS
    : MAX_HYGIENE_SUMMARY_CHARS;

  const header = [`# ${title}`, "", ...introLines(report)].join("\n");
  const prefer = [
    "## Prefer",
    ...preferLines(options.sourceRoots),
    "",
    "This file is intentionally short. Do not append logs, lockfile excerpts, or",
    "vendor billing notes.",
  ].join("\n");

  // A "do not load" bullet naming the file its author has open is the exact
  // false positive #137 exists to prevent.
  const active = activePathSet(report);
  let excludeEntries = excludedEntriesForInstructions(report.findings, active, {
    keepDirs: options.keepDirs,
  });
  let hygiene = hygieneBullets(report.findings, summaryMaxChars);
  let advisory = advisoryBullets(report.findings, summaryMaxChars);
  let themes = whyThemes(report);
  const includeCompactOutput = shouldIncludeCompactOutputGuidance(report.findings);
  const stackSection = instructionStackSection(report);
  let includeStack = stackSection !== undefined;

  const build = (): string => {
    const sections: string[] = [header];

    sections.push(...excludeSections(excludeEntries));

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

    if (includeStack && stackSection) {
      sections.push(stackSection);
    }

    if (advisory.length > 0) {
      sections.push(
        [
          "## Review only",
          "- These rows are advisory — TokenForge does not apply excludes or refactors.",
          ...advisory.map(
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
    } else if (includeStack) {
      includeStack = false;
    } else if (excludeEntries.length > 0) {
      excludeEntries = excludeEntries.slice(0, -1);
    } else if (advisory.length > 0) {
      advisory = advisory.slice(0, -1);
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
