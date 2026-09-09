import { MAX_ROLE_RULE_CHARS, MAX_ROLE_SAMPLE_FILES } from "../domain/constants";
import type {
  DirectoryRole,
  DirectoryRoleAssignment,
  ReasoningStrategy,
  RoleSignal,
  StackLanguage,
  StackProfile,
} from "../domain/types";

/**
 * How wide each strategy lets the agent reason, ascending.
 *
 * The hybrid path (F26 Wave D) may only ever *lower* this number for a role —
 * an LLM can turn a generic linear rule into a specific one, but it can never
 * promote a directory to `explore`, which is the one that invites a redesign.
 */
export const REASONING_BREADTH: Readonly<Record<ReasoningStrategy, number>> = {
  explore: 3,
  linear: 2,
  checklist: 1,
  minimal: 0,
};

/**
 * The behaviour each role asks for.
 *
 * These strings are the payload. The strategy id stays out of them on purpose:
 * a rendered "use chain-of-thought" is a label the agent pattern-matches into
 * generic preamble, and it displaces the specific instruction inside the byte
 * budget. Same instinct as the no-token-counts rule in HEURISTIC_FIX_DESIGN.
 */
export const ROLE_RULES: Readonly<
  Record<DirectoryRole, { strategy: ReasoningStrategy; rule: string }>
> = {
  routes: {
    strategy: "explore",
    rule: "Sketch two or three ways to compose this screen, note the trade-off, then pick one and say why.",
  },
  shared_components: {
    strategy: "linear",
    rule: "Work in order: props, states, accessibility, render. This is imported in many places - keep the contract.",
  },
  domain: {
    strategy: "linear",
    rule: "State the invariant this module protects, then reason forward. Make the smallest change that holds it.",
  },
  state: {
    strategy: "linear",
    rule: "Trace action, store update, selector, consumer before editing. Keep the shape other code reads.",
  },
  api: {
    strategy: "linear",
    rule: "Settle the contract, then validation, then the happy path, then each error case.",
  },
  data: {
    strategy: "linear",
    rule: "Read the existing schema first. Do not change it or add a migration unless the task asks.",
  },
  infra: {
    strategy: "checklist",
    rule: "Work as a checklist: what changes, what to re-run, how to verify, how to roll back.",
  },
  tests: {
    strategy: "linear",
    rule: "Arrange, act, assert. One behaviour per test. Never weaken an assertion to make it pass.",
  },
  utils: {
    strategy: "minimal",
    rule: "Make the smallest correct change and add a unit test. Do not restructure the module.",
  },
  types: {
    strategy: "linear",
    rule: "Change the type first, then follow the compiler to every caller.",
  },
  docs: {
    strategy: "minimal",
    rule: "Read the affected section, state what changes, then edit only that section.",
  },
};

/**
 * A directory name the tables recognise.
 *
 * `ambiguous` marks a name whose meaning differs across ecosystems (`models/`,
 * `app/`, `core/`). Such a name may not reach `explore` on the name alone, and
 * falls back to {@link AMBIGUOUS_FALLBACK_ROLE} when nothing corroborates it.
 */
type RolePattern = {
  role: DirectoryRole;
  ambiguous?: boolean;
};

/** Where an uncorroborated ambiguous name lands: linear, never exploratory. */
const AMBIGUOUS_FALLBACK_ROLE: DirectoryRole = "domain";

/** Patterns every language shares — build, CI, tests, docs, migrations. */
const AGNOSTIC_PATTERNS: ReadonlyMap<string, RolePattern> = new Map([
  ["docs", { role: "docs" }],
  ["doc", { role: "docs" }],
  ["content", { role: "docs" }],
  ["posts", { role: "docs" }],
  ["scripts", { role: "infra" }],
  ["infra", { role: "infra" }],
  ["deploy", { role: "infra" }],
  ["ci", { role: "infra" }],
  ["terraform", { role: "infra" }],
  [".github", { role: "infra" }],
  ["config", { role: "infra", ambiguous: true }],
  ["test", { role: "tests" }],
  ["tests", { role: "tests" }],
  ["__tests__", { role: "tests" }],
  ["spec", { role: "tests" }],
  ["e2e", { role: "tests" }],
  ["cypress", { role: "tests" }],
  ["migrations", { role: "data" }],
]);

/**
 * Language-scoped tables.
 *
 * A polyglot repo must not have TypeScript assumptions applied to Go paths:
 * `internal/` in Go is a visibility rule, not a role, and a Go `main` has no
 * layout alternatives to explore. Registering per language is what keeps the
 * Go root out of `explore` entirely.
 */
const LANGUAGE_PATTERNS: Readonly<
  Partial<Record<StackLanguage, ReadonlyMap<string, RolePattern>>>
> = {
  typescript: tsPatterns(),
  javascript: tsPatterns(),
  python: new Map<string, RolePattern>([
    ["views", { role: "routes", ambiguous: true }],
    ["models", { role: "domain", ambiguous: true }],
    ["serializers", { role: "types" }],
    ["schemas", { role: "types" }],
    ["services", { role: "domain" }],
    ["api", { role: "api" }],
    ["repositories", { role: "data" }],
    ["management", { role: "infra" }],
    ["utils", { role: "utils" }],
    ["helpers", { role: "utils" }],
  ]),
  go: new Map<string, RolePattern>([
    // No `internal/`: in Go that is a visibility boundary, not a role.
    ["cmd", { role: "domain" }],
    ["pkg", { role: "domain" }],
    ["api", { role: "api" }],
    ["handlers", { role: "api" }],
    ["store", { role: "data", ambiguous: true }],
  ]),
};

function tsPatterns(): ReadonlyMap<string, RolePattern> {
  return new Map<string, RolePattern>([
    ["pages", { role: "routes" }],
    ["screens", { role: "routes" }],
    ["routes", { role: "routes" }],
    ["views", { role: "routes", ambiguous: true }],
    ["app", { role: "routes", ambiguous: true }],
    ["components", { role: "shared_components" }],
    ["ui", { role: "shared_components" }],
    ["widgets", { role: "shared_components" }],
    ["elements", { role: "shared_components" }],
    ["primitives", { role: "shared_components" }],
    ["common", { role: "shared_components", ambiguous: true }],
    ["shared", { role: "shared_components", ambiguous: true }],
    ["domain", { role: "domain" }],
    ["usecases", { role: "domain" }],
    ["entities", { role: "domain" }],
    ["services", { role: "domain" }],
    ["core", { role: "domain", ambiguous: true }],
    ["model", { role: "domain", ambiguous: true }],
    ["models", { role: "domain", ambiguous: true }],
    ["store", { role: "state", ambiguous: true }],
    ["stores", { role: "state" }],
    ["state", { role: "state" }],
    ["slices", { role: "state" }],
    ["hooks", { role: "state", ambiguous: true }],
    ["context", { role: "state", ambiguous: true }],
    ["api", { role: "api" }],
    ["controllers", { role: "api" }],
    ["handlers", { role: "api" }],
    ["resolvers", { role: "api" }],
    ["endpoints", { role: "api" }],
    ["repositories", { role: "data" }],
    ["dao", { role: "data" }],
    ["db", { role: "data" }],
    ["prisma", { role: "data" }],
    ["utils", { role: "utils" }],
    ["helpers", { role: "utils" }],
    ["support", { role: "utils" }],
    ["lib", { role: "utils", ambiguous: true }],
    ["types", { role: "types" }],
    ["schema", { role: "types" }],
    ["schemas", { role: "types" }],
    ["graphql", { role: "types" }],
  ]);
}

/** Extension → language, for reading a directory dominant language. */
const EXTENSION_LANGUAGES: ReadonlyMap<string, StackLanguage> = new Map([
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".mts", "typescript"],
  [".cts", "typescript"],
  [".js", "javascript"],
  [".jsx", "javascript"],
  [".mjs", "javascript"],
  [".cjs", "javascript"],
  [".py", "python"],
  [".go", "go"],
  [".rs", "rust"],
  [".java", "java"],
  [".kt", "java"],
  [".rb", "ruby"],
  [".php", "php"],
]);

/** Segments that make everything under them feature-local, not shared. */
const FEATURE_SEGMENTS: ReadonlySet<string> = new Set([
  "features",
  "feature",
  "modules",
]);

/** ORMs whose presence turns a `models/` directory into the data layer. */
const SCHEMA_OWNING_ORMS: ReadonlySet<string> = new Set([
  "prisma",
  "sequelize",
  "mongoose",
  "typeorm",
  "mikro-orm",
  "django-orm",
  "activerecord",
  "sqlalchemy",
  "gorm",
]);

/** Basenames that prove an `app/` directory is a file-system router. */
const ROUTER_FILE_STEMS: ReadonlySet<string> = new Set([
  "page",
  "layout",
  "route",
  "template",
  "loading",
  "error",
]);

/** Basenames that prove an `app/` directory is a server entry point instead. */
const SERVER_ENTRY_STEMS: ReadonlySet<string> = new Set([
  "server",
  "main",
  "application",
  "bootstrap",
]);

/** One directory as the walk saw it. */
export type DirectoryEntry = {
  /** Repo-relative directory path, POSIX separators, no trailing slash. */
  dir: string;
  /** Basenames of the files directly inside it. */
  fileNames: readonly string[];
};

export type ResolveDirectoryRolesInput = {
  directories: readonly DirectoryEntry[];
  stack: StackProfile;
  /** Top-level directories holding living source, from the same walk. */
  sourceRoots?: readonly string[];
};

function segmentsOf(dir: string): string[] {
  return dir.replaceAll("\\", "/").split("/").filter(Boolean);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function stemOf(name: string): string {
  const dot = name.indexOf(".");
  return (dot === -1 ? name : name.slice(0, dot)).toLowerCase();
}

/**
 * The language a directory is written in, by counting its own files first.
 *
 * Falling back to the stack primary language keeps a directory of only `.md` or
 * only `.json` attached to the repo it lives in, instead of dropping out of
 * every table because it holds no code of its own.
 */
function languageOf(
  fileNames: readonly string[],
  stack: StackProfile,
): StackLanguage | "unknown" {
  const counts = new Map<StackLanguage, number>();
  for (const name of fileNames) {
    const language = EXTENSION_LANGUAGES.get(extensionOf(name));
    if (language) {
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  return ranked[0]?.[0] ?? stack.languages[0] ?? "unknown";
}

function patternFor(
  name: string,
  language: StackLanguage | "unknown",
): RolePattern | undefined {
  const table = language === "unknown" ? undefined : LANGUAGE_PATTERNS[language];
  return table?.get(name) ?? AGNOSTIC_PATTERNS.get(name);
}

type Resolution = { role: DirectoryRole; signal: RoleSignal };

/**
 * Layer 1 — the stack profile.
 *
 * `models/` is the canonical case: with an ORM in the dependency list it is the
 * data layer, and without one it is domain entities. Answering that from
 * declared dependencies is the difference between useful advice and telling an
 * agent to redesign someone DDD aggregates.
 */
function stackLayer(
  name: string,
  pattern: RolePattern,
  stack: StackProfile,
): Resolution | undefined {
  if (name === "models" || name === "model") {
    if (stack.orm !== undefined && SCHEMA_OWNING_ORMS.has(stack.orm)) {
      return { role: "data", signal: "stack" };
    }
    return undefined;
  }
  if (name === "hooks" || name === "context") {
    const reactish = stack.frameworks.some((framework) =>
      ["react", "next", "remix", "solid", "react-native", "expo"].includes(framework),
    );
    return reactish ? { role: pattern.role, signal: "stack" } : undefined;
  }
  if (name === "app") {
    const routerFramework = stack.frameworks.some((framework) =>
      ["next", "nuxt", "sveltekit", "remix", "astro"].includes(framework),
    );
    return routerFramework ? { role: "routes", signal: "stack" } : undefined;
  }
  return undefined;
}

/**
 * Layer 2 — what the directory actually holds.
 *
 * An `app/` with `page.tsx` anywhere beneath it is a file-system router; an
 * `app/` with `server.ts` sitting directly in it is an Express root and gets no
 * role at all, because the wrong answer here is worse than silence.
 *
 * The two checks read different file sets on purpose: a router proves itself
 * from its whole subtree (the route files are the leaves), while a server entry
 * point is by definition the file in the directory itself.
 */
function shapeLayer(
  name: string,
  group: MatchedGroup,
): Resolution | "no_role" | undefined {
  if (name !== "app") {
    return undefined;
  }
  const ownStems = new Set(group.ownFileNames.map(stemOf));
  if ([...SERVER_ENTRY_STEMS].some((stem) => ownStems.has(stem))) {
    return "no_role";
  }
  const subtreeStems = new Set(group.fileNames.map(stemOf));
  if ([...ROUTER_FILE_STEMS].some((stem) => subtreeStems.has(stem))) {
    return { role: "routes", signal: "shape" };
  }
  return undefined;
}

/**
 * Layer 3 — the company a directory keeps.
 *
 * `components/` beside `pages/` or `hooks/` is the shared UI bucket. Without
 * those neighbours the name alone is doing all the work, which is exactly the
 * case the ambiguity rule exists to catch.
 */
function siblingLayer(
  name: string,
  pattern: RolePattern,
  siblingNames: ReadonlySet<string>,
): Resolution | undefined {
  if (name !== "common" && name !== "shared") {
    return undefined;
  }
  const uiNeighbours = ["components", "pages", "app", "hooks", "ui"];
  if (uiNeighbours.some((neighbour) => siblingNames.has(neighbour))) {
    return { role: pattern.role, signal: "sibling" };
  }
  return undefined;
}

/**
 * Layer 4 — where it sits.
 *
 * `src/components/` is the shared bucket. `src/features/checkout/components/`
 * belongs to one feature, so the shared-component rule ("this is imported in
 * many places") is simply false there; it inherits the feature reasoning.
 */
function depthLayer(
  dir: string,
  pattern: RolePattern,
): Resolution | undefined {
  if (pattern.role !== "shared_components") {
    return undefined;
  }
  const parents = segmentsOf(dir).slice(0, -1);
  if (parents.some((segment) => FEATURE_SEGMENTS.has(segment))) {
    return { role: "domain", signal: "depth" };
  }
  return undefined;
}

/** Up to three representative files, shortest path first for stability. */
function sampleFilesFor(group: MatchedGroup): string[] {
  return [...group.filePaths]
    .filter((path) => EXTENSION_LANGUAGES.has(extensionOf(path)))
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, MAX_ROLE_SAMPLE_FILES);
}

/**
 * A role-bearing directory and every file the walk found beneath it.
 *
 * `dir` is the directory whose own name matched, which is often an ancestor of
 * the directory a file actually sits in: a route file lives at
 * `app/api/users/route.ts`, so `api` is the segment carrying the meaning and
 * `users` is just the resource name.
 */
type MatchedGroup = {
  dir: string;
  name: string;
  pattern: RolePattern;
  /** Basenames from the whole subtree, for language and router evidence. */
  fileNames: string[];
  /** Basenames of files sitting directly in `dir`, for server-entry evidence. */
  ownFileNames: string[];
  /** Repo-relative paths from the whole subtree, for sample files. */
  filePaths: string[];
};

/**
 * The deepest segment of `dir` that any table recognises, with its index.
 *
 * Matching only the last segment would miss almost every file-system router:
 * `app/api/users` and `app/dashboard/settings` end in resource names, and the
 * segment that carries the role (`api`, `app`) is always an ancestor of them.
 * Scanning deepest-first keeps "most specific wins" while letting the rule land
 * on the directory that actually means something.
 */
function deepestMatchingSegment(
  segments: readonly string[],
  language: StackLanguage | "unknown",
): { index: number; name: string; pattern: RolePattern } | undefined {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const name = segments[index]?.toLowerCase();
    if (name === undefined) {
      continue;
    }
    const pattern = patternFor(name, language);
    if (pattern) {
      return { index, name, pattern };
    }
  }
  return undefined;
}

/**
 * Directory roles for the reasoning pack: deepest matching segment wins, with
 * the four disambiguation layers applied in order.
 *
 * Three invariants hold for every returned assignment:
 *
 * 1. A rule lands on the directory whose name carries the role, and its glob
 *    speaks for the subtree below it.
 * 2. `explore` is never reached on an ambiguous name that nothing corroborated.
 *    Exploring alternatives is the one strategy that invites a redesign, and a
 *    name meaning three different things across ecosystems has not earned it.
 * 3. A deeper directory is dropped when the nearest matched ancestor already
 *    says the same thing, so a role speaks once per subtree.
 */
export function resolveDirectoryRoles(
  input: ResolveDirectoryRolesInput,
): DirectoryRoleAssignment[] {
  const { stack } = input;
  const sourceRoots = new Set(input.sourceRoots ?? []);

  // Directory names grouped by parent, for the sibling layer.
  const siblingsByParent = new Map<string, Set<string>>();
  for (const entry of input.directories) {
    const segments = segmentsOf(entry.dir);
    const parent = segments.slice(0, -1).join("/");
    const name = segments[segments.length - 1];
    if (name !== undefined) {
      const bucket = siblingsByParent.get(parent) ?? new Set<string>();
      bucket.add(name);
      siblingsByParent.set(parent, bucket);
    }
  }

  const groups = new Map<string, MatchedGroup>();

  for (const entry of input.directories) {
    const segments = segmentsOf(entry.dir);
    if (segments.length === 0) {
      continue;
    }
    const language = languageOf(entry.fileNames, stack);
    const matched = deepestMatchingSegment(segments, language);
    if (!matched) {
      continue;
    }

    const dir = segments.slice(0, matched.index + 1).join("/");
    const group = groups.get(dir) ?? {
      dir,
      name: matched.name,
      pattern: matched.pattern,
      fileNames: [],
      ownFileNames: [],
      filePaths: [],
    };
    group.fileNames.push(...entry.fileNames);
    group.filePaths.push(...entry.fileNames.map((name) => `${entry.dir}/${name}`));
    if (entry.dir === dir) {
      group.ownFileNames.push(...entry.fileNames);
    }
    groups.set(dir, group);
  }

  const candidates: DirectoryRoleAssignment[] = [];

  for (const group of groups.values()) {
    const { name, pattern } = group;
    const segments = segmentsOf(group.dir);
    const language = languageOf(group.fileNames, stack);

    // A top-level `lib/` that is a source root is the primary source tree, not
    // a bag of helpers. Telling an agent to stop reasoning there would be the
    // most damaging thing this feature could say, so it says nothing instead.
    if (name === "lib" && segments.length === 1 && sourceRoots.has(group.dir)) {
      continue;
    }

    const shape = shapeLayer(name, group);
    if (shape === "no_role") {
      continue;
    }

    const parent = segments.slice(0, -1).join("/");
    const siblings = siblingsByParent.get(parent) ?? new Set<string>();

    const resolution: Resolution =
      stackLayer(name, pattern, stack) ??
      shape ??
      siblingLayer(name, pattern, siblings) ??
      depthLayer(group.dir, pattern) ??
      { role: pattern.role, signal: "name" };

    // Invariant 2: an ambiguous name settled by nothing but itself never gets
    // the exploratory strategy, and never keeps a role it did not earn.
    const role =
      pattern.ambiguous &&
      resolution.signal === "name" &&
      ROLE_RULES[resolution.role].strategy === "explore"
        ? AMBIGUOUS_FALLBACK_ROLE
        : resolution.role;

    const spec = ROLE_RULES[role];
    candidates.push({
      dir: group.dir,
      globs: [`${group.dir}/**`],
      role,
      strategy: spec.strategy,
      rule: spec.rule,
      signal: resolution.signal,
      language,
      sampleFiles: sampleFilesFor(group),
    });
  }

  return dropRedundantDescendants(candidates);
}

/**
 * Invariant 2 — one voice per subtree.
 *
 * `app/` (routes) and `app/api/` (api) both survive because they say different
 * things. `src/components/` under `components/` does not.
 */
function dropRedundantDescendants(
  candidates: readonly DirectoryRoleAssignment[],
): DirectoryRoleAssignment[] {
  const ordered = [...candidates].sort(
    (a, b) =>
      segmentsOf(a.dir).length - segmentsOf(b.dir).length ||
      a.dir.localeCompare(b.dir),
  );

  const accepted: DirectoryRoleAssignment[] = [];
  for (const candidate of ordered) {
    const ancestor = accepted
      .filter((other) => candidate.dir.startsWith(`${other.dir}/`))
      .sort((a, b) => segmentsOf(b.dir).length - segmentsOf(a.dir).length)[0];
    if (ancestor && ancestor.role === candidate.role) {
      continue;
    }
    accepted.push(candidate);
  }

  return accepted.sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * Openers that make a rule a description instead of an instruction.
 *
 * "You should keep the contract" costs bytes to say what "Keep the contract"
 * says, and reads as commentary the agent may weigh rather than follow.
 */
const NON_IMPERATIVE_OPENERS: readonly string[] = [
  "you ",
  "the ",
  "this ",
  "it ",
  "we ",
  "there ",
  "when ",
  "if ",
];

/** True when a rule opens with a bare verb, as an instruction does. */
export function startsWithImperativeVerb(rule: string): boolean {
  const trimmed = rule.trimStart();
  if (!/^[A-Z][a-z]+[ ,:]/.test(trimmed)) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  return !NON_IMPERATIVE_OPENERS.some((opener) => lower.startsWith(opener));
}

/**
 * True when a rule may be rendered into a provider instruction file.
 *
 * Three things at once, because they fail together: a rule that runs long, one
 * that names a reasoning strategy, and one phrased as description rather than
 * instruction are all the same defect - text the agent reads past instead of
 * acting on. Wave D reuses this to validate LLM-refined rules.
 */
export function isRenderableRoleRule(rule: string): boolean {
  return (
    rule.length <= MAX_ROLE_RULE_CHARS &&
    !hasStrategyVocabulary(rule) &&
    startsWithImperativeVerb(rule)
  );
}

/**
 * Vocabulary the generated text must never contain.
 *
 * A rendered strategy label invites generic preamble instead of the specific
 * behaviour the rule asks for, and costs budget doing it. The taxonomy lives in
 * `REASONING_PACK_DESIGN.md` and the `ReasoningStrategy` type, nowhere else.
 */
const STRATEGY_VOCABULARY: readonly RegExp[] = [
  /chain[-\s]of[-\s]thought/i,
  /tree[-\s]of[-\s]thought/i,
  /\bcot\b/i,
  /\btot\b/i,
  /step[-\s]by[-\s]step/i,
  /let\s+us\s+think/i,
  /think\s+(?:it\s+)?through\s+step/i,
  /cadeia\s+de\s+pensamento/i,
  /passo\s+a\s+passo/i,
];

export function hasStrategyVocabulary(text: string): boolean {
  return STRATEGY_VOCABULARY.some((pattern) => pattern.test(text));
}
