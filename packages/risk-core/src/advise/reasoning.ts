import {
  MAX_REASONING_PERSONA_LINES,
  MAX_REASONING_SECTION_BYTES,
  MIN_REASONING_DISTINCT_ROLES,
  MIN_REASONING_ROLE_DIRS,
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
} from "../domain/constants";
import type { ReasoningPackMode } from "../config/tokenforge-config";
import type {
  DirectoryRole,
  DirectoryRoleAssignment,
  StackProfile,
} from "../domain/types";
import { isRenderableRoleRule } from "../stack/roles";

/** Heading the section renders under. */
export const REASONING_SECTION_HEADING = "## How to reason about this repo";

/**
 * Which rows survive when the section will not fit, most valuable first.
 *
 * Trimming by table position would keep whatever happened to sort first and
 * drop the deepest, most specific rows — on a wide repo that means losing the
 * routes and domain guidance while a generic `utils/` line survives. Value
 * order is the only ordering that degrades sensibly.
 */
const ROLE_RENDER_PRIORITY: readonly DirectoryRole[] = [
  "routes",
  "domain",
  "data",
  "api",
  "state",
  "shared_components",
  "infra",
  "tests",
  "types",
  "docs",
  "utils",
];

const ROLE_RANK = new Map<DirectoryRole, number>(
  ROLE_RENDER_PRIORITY.map((role, index) => [role, index]),
);

/** Human names for the frameworks the persona is allowed to say out loud. */
const FRAMEWORK_LABELS: ReadonlyMap<string, string> = new Map([
  ["next", "Next.js"],
  ["nuxt", "Nuxt"],
  ["angular", "Angular"],
  ["nest", "NestJS"],
  ["remix", "Remix"],
  ["sveltekit", "SvelteKit"],
  ["svelte", "Svelte"],
  ["astro", "Astro"],
  ["vue", "Vue"],
  ["react", "React"],
  ["react-native", "React Native"],
  ["solid", "Solid"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["koa", "Koa"],
  ["hono", "Hono"],
  ["django", "Django"],
  ["flask", "Flask"],
  ["fastapi", "FastAPI"],
  ["gin", "Gin"],
  ["echo", "Echo"],
  ["fiber", "Fiber"],
  ["axum", "Axum"],
  ["actix", "Actix"],
  ["rails", "Rails"],
  ["laravel", "Laravel"],
  ["spring-boot", "Spring Boot"],
]);

const LANGUAGE_LABELS: ReadonlyMap<string, string> = new Map([
  ["typescript", "TypeScript"],
  ["javascript", "JavaScript"],
  ["python", "Python"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["java", "Java"],
  ["ruby", "Ruby"],
  ["php", "PHP"],
]);

const ORM_LABELS: ReadonlyMap<string, string> = new Map([
  ["prisma", "Prisma"],
  ["drizzle", "Drizzle"],
  ["typeorm", "TypeORM"],
  ["sequelize", "Sequelize"],
  ["mongoose", "Mongoose"],
  ["mikro-orm", "MikroORM"],
  ["sqlalchemy", "SQLAlchemy"],
  ["django-orm", "the Django ORM"],
  ["activerecord", "ActiveRecord"],
  ["gorm", "GORM"],
]);

const STYLING_LABELS: ReadonlyMap<string, string> = new Map([
  ["tailwind", "Tailwind utility classes"],
  ["styled-components", "styled-components"],
  ["emotion", "Emotion"],
  ["sass", "Sass"],
  ["mui", "MUI"],
  ["chakra", "Chakra UI"],
]);

/**
 * Openings that mean the repo already has a persona of its own.
 *
 * The managed markers protect the bytes a user wrote, not the intent. A second
 * persona in the same always-on file gives the agent two competing framings and
 * reads to the author as though TokenForge overwrote their voice — so when one
 * is already there, this section contributes routing only.
 */
const PERSONA_MARKERS: readonly RegExp[] = [
  /^\s*#{1,6}\s*(persona|role|who you are)\b/im,
  /\byou\s+are\s+(?:an?|the)\s+\w+/i,
  /\bact\s+as\s+(?:an?|the)\s+\w+/i,
  /\byour\s+role\s+is\b/i,
  /\bvocê\s+é\s+(?:um|uma|o|a)\s+\w+/i,
];

/**
 * Instruction text with the section `apply` owns removed.
 *
 * A previous run's managed section is our own output, not the author's voice.
 * Counting it would make the persona appear on the first apply and vanish on
 * the second — output that flips run to run is worse than either answer.
 */
function userTextOutsideManagedSection(text: string): string {
  const begin = text.indexOf(TOKENFORGE_SECTION_BEGIN);
  if (begin === -1) {
    return text;
  }
  const end = text.indexOf(TOKENFORGE_SECTION_END, begin);
  const after =
    end === -1 ? "" : text.slice(end + TOKENFORGE_SECTION_END.length);
  return `${text.slice(0, begin)}${after}`;
}

/** True when instruction text already establishes a persona of its own. */
export function hasExistingPersona(text: string | undefined): boolean {
  if (text === undefined || text.trim().length === 0) {
    return false;
  }
  const authored = userTextOutsideManagedSection(text);
  return PERSONA_MARKERS.some((marker) => marker.test(authored));
}

export type ReasoningSectionInput = {
  stackProfile?: StackProfile;
  directoryRoles?: readonly DirectoryRoleAssignment[];
  mode: ReasoningPackMode;
  /**
   * Instruction bodies the repo already carries, one entry per file. Read only
   * to decide whether a persona would be a second one. Never rendered.
   *
   * Kept as separate entries rather than one joined string so a heading at the
   * very start of a file still reads as a heading — joining would put it
   * mid-line and hide exactly the marker this looks for.
   */
  existingInstructionTexts?: readonly string[];
  /** Byte ceiling for the whole section, heading included. */
  maxBytes?: number;
};

/**
 * True when the repo has enough shape for routing advice to mean anything.
 *
 * A repo with three distinct roles across five directories is, by construction,
 * not a handful of files — so this subsumes a separate file-count floor rather
 * than adding a second number that says the same thing less directly.
 */
export function meetsReasoningEmissionGate(
  directoryRoles: readonly DirectoryRoleAssignment[],
): boolean {
  const distinct = new Set(directoryRoles.map((role) => role.role));
  return (
    directoryRoles.length >= MIN_REASONING_ROLE_DIRS &&
    distinct.size >= MIN_REASONING_DISTINCT_ROLES
  );
}

/**
 * Persona lines, each earned by a declared dependency.
 *
 * Phrased as facts about the repo rather than an identity ("You are a Next.js
 * engineer"): a fact sits beside whatever voice the author already chose, while
 * an identity claim competes with it.
 */
export function personaLines(stack: StackProfile): string[] {
  if (stack.confidence !== "high" && stack.confidence !== "medium") {
    return [];
  }

  const lines: string[] = [];

  const frameworks = stack.frameworks
    .map((framework) => FRAMEWORK_LABELS.get(framework))
    .filter((label): label is string => label !== undefined)
    .slice(0, 2);
  const language = LANGUAGE_LABELS.get(stack.languages[0] ?? "");

  if (frameworks.length > 0 && language) {
    lines.push(`This repo is built with ${joinWords(frameworks)} on ${language}.`);
  } else if (frameworks.length > 0) {
    lines.push(`This repo is built with ${joinWords(frameworks)}.`);
  } else if (language) {
    lines.push(`This repo is written in ${language}.`);
  }

  const orm = stack.orm ? ORM_LABELS.get(stack.orm) : undefined;
  if (orm) {
    lines.push(`${orm} owns the data layer — do not hand-write SQL.`);
  }

  const styling = stack.styling
    .map((style) => STYLING_LABELS.get(style))
    .find((label): label is string => label !== undefined);
  if (styling) {
    lines.push(`Styling is ${styling} — follow what neighbouring files do.`);
  }

  return lines.slice(0, MAX_REASONING_PERSONA_LINES);
}

function joinWords(words: readonly string[]): string {
  if (words.length <= 1) {
    return words[0] ?? "";
  }
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Rows ordered for the reader: highest-value role first, then by path. */
function orderedRows(
  directoryRoles: readonly DirectoryRoleAssignment[],
): DirectoryRoleAssignment[] {
  return [...directoryRoles]
    .filter((assignment) => isRenderableRoleRule(assignment.rule))
    .sort(
      (a, b) =>
        (ROLE_RANK.get(a.role) ?? ROLE_RENDER_PRIORITY.length) -
          (ROLE_RANK.get(b.role) ?? ROLE_RENDER_PRIORITY.length) ||
        a.dir.localeCompare(b.dir),
    );
}

function renderRow(assignment: DirectoryRoleAssignment): string {
  const globs = assignment.globs.map((glob) => `\`${glob}\``).join(", ");
  return `| ${globs} | ${assignment.rule} |`;
}

function render(persona: readonly string[], rows: readonly DirectoryRoleAssignment[]): string {
  const parts: string[] = [REASONING_SECTION_HEADING];
  if (persona.length > 0) {
    parts.push("", ...persona);
  }
  if (rows.length > 0) {
    parts.push(
      "",
      "| Path | Approach |",
      "| --- | --- |",
      ...rows.map(renderRow),
    );
  }
  return parts.join("\n");
}

/**
 * The `## How to reason about this repo` section, or `undefined`.
 *
 * Returns nothing — rather than a thinner section — when the mode is `off`, the
 * inputs are missing, or the repo has too little shape for routing advice to
 * mean anything. Silence is the correct output in all three cases.
 *
 * Rows drop from the least valuable role upward until the section fits its own
 * sub-budget, which is deliberately small: this text is added to a file the
 * agent reads every turn, and F26 makes no savings claim to pay for it.
 */
export function buildReasoningSection(
  input: ReasoningSectionInput,
): string | undefined {
  if (input.mode === "off") {
    return undefined;
  }
  const directoryRoles = input.directoryRoles ?? [];
  if (!meetsReasoningEmissionGate(directoryRoles)) {
    return undefined;
  }

  const maxBytes = input.maxBytes ?? MAX_REASONING_SECTION_BYTES;

  const wantsPersona =
    input.mode === "roles+persona" &&
    input.stackProfile !== undefined &&
    !(input.existingInstructionTexts ?? []).some(hasExistingPersona);
  const persona = wantsPersona ? personaLines(input.stackProfile!) : [];

  let rows = orderedRows(directoryRoles);
  if (rows.length === 0) {
    return undefined;
  }

  let text = render(persona, rows);
  while (utf8Bytes(text) > maxBytes && rows.length > 1) {
    rows = rows.slice(0, -1);
    text = render(persona, rows);
  }

  // One row and a persona that still will not fit: the table is the payload,
  // so the persona goes before the last piece of routing does.
  if (utf8Bytes(text) > maxBytes && persona.length > 0) {
    text = render([], rows);
  }

  return utf8Bytes(text) > maxBytes ? undefined : text;
}
