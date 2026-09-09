import type {
  StackConfidence,
  StackLanguage,
  StackProfile,
} from "../domain/types";

/**
 * Repo evidence the detector reads. The kernel never touches the filesystem —
 * the caller (the `apply`-side walk) reads these while it is already walking.
 */
export type DetectStackInput = {
  /**
   * Repo-relative manifest path → raw content, for the manifests the walk found.
   * Unparseable content is ignored, never thrown on.
   */
  manifests?: ReadonlyMap<string, string>;
  /**
   * Repo-relative paths present in the tree. Only basenames and whether a path
   * sits at the root matter here, so a caller may pass a pruned list.
   */
  paths?: readonly string[];
};

/** Dependency name → framework id. */
const FRAMEWORK_DEPS: ReadonlyMap<string, string> = new Map([
  // JS / TS
  ["next", "next"],
  ["nuxt", "nuxt"],
  ["@angular/core", "angular"],
  ["@nestjs/core", "nest"],
  ["@remix-run/react", "remix"],
  ["@sveltejs/kit", "sveltekit"],
  ["astro", "astro"],
  ["svelte", "svelte"],
  ["vue", "vue"],
  ["react-native", "react-native"],
  ["expo", "expo"],
  ["react", "react"],
  ["solid-js", "solid"],
  ["express", "express"],
  ["fastify", "fastify"],
  ["koa", "koa"],
  ["hono", "hono"],
  ["electron", "electron"],
  // Python
  ["django", "django"],
  ["flask", "flask"],
  ["fastapi", "fastapi"],
  // Go
  ["github.com/gin-gonic/gin", "gin"],
  ["github.com/labstack/echo", "echo"],
  ["github.com/gofiber/fiber", "fiber"],
  // Rust
  ["axum", "axum"],
  ["actix-web", "actix"],
  ["rocket", "rocket"],
  // Ruby / PHP / Java
  ["rails", "rails"],
  ["laravel/framework", "laravel"],
  ["symfony/framework-bundle", "symfony"],
  ["spring-boot-starter", "spring-boot"],
]);

/** Dependency name → ORM id. */
const ORM_DEPS: ReadonlyMap<string, string> = new Map([
  ["@prisma/client", "prisma"],
  ["prisma", "prisma"],
  ["drizzle-orm", "drizzle"],
  ["typeorm", "typeorm"],
  ["sequelize", "sequelize"],
  ["mongoose", "mongoose"],
  ["@mikro-orm/core", "mikro-orm"],
  ["knex", "knex"],
  ["sqlalchemy", "sqlalchemy"],
  ["django", "django-orm"],
  ["gorm.io/gorm", "gorm"],
  ["activerecord", "activerecord"],
  ["diesel", "diesel"],
]);

const TEST_RUNNER_DEPS: ReadonlyMap<string, string> = new Map([
  ["vitest", "vitest"],
  ["jest", "jest"],
  ["mocha", "mocha"],
  ["ava", "ava"],
  ["jasmine", "jasmine"],
  ["karma", "karma"],
  ["@playwright/test", "playwright"],
  ["playwright", "playwright"],
  ["cypress", "cypress"],
  ["pytest", "pytest"],
  ["rspec", "rspec"],
  ["junit", "junit"],
  ["github.com/stretchr/testify", "testify"],
]);

const STYLING_DEPS: ReadonlyMap<string, string> = new Map([
  ["tailwindcss", "tailwind"],
  ["styled-components", "styled-components"],
  ["@emotion/react", "emotion"],
  ["sass", "sass"],
  ["less", "less"],
  ["@vanilla-extract/css", "vanilla-extract"],
  ["@stitches/react", "stitches"],
  ["@mui/material", "mui"],
  ["@chakra-ui/react", "chakra"],
  ["bootstrap", "bootstrap"],
]);

const MONOREPO_DEPS: ReadonlyMap<string, string> = new Map([
  ["nx", "nx"],
  ["turbo", "turborepo"],
  ["lerna", "lerna"],
  ["@microsoft/rush", "rush"],
]);

/** Lockfile basename → package manager id. */
const LOCKFILE_MANAGERS: ReadonlyMap<string, string> = new Map([
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
  ["poetry.lock", "poetry"],
  ["Pipfile.lock", "pipenv"],
  ["uv.lock", "uv"],
  ["pdm.lock", "pdm"],
  ["Cargo.lock", "cargo"],
  ["go.sum", "go"],
  ["Gemfile.lock", "bundler"],
  ["composer.lock", "composer"],
]);

/**
 * Config-file stem (from `<stem>.config.*`) → what its presence attests.
 *
 * Presence is weaker evidence than a dependency — a stray `vite.config.ts` in a
 * repo with no `vite` dependency should not read as a framework the agent must
 * respect — so these only ever add to what the manifests already said, and never
 * raise confidence to `high` on their own. See {@link confidenceFor}.
 */
const CONFIG_STEM_FRAMEWORKS: ReadonlyMap<string, string> = new Map([
  ["next", "next"],
  ["nuxt", "nuxt"],
  ["astro", "astro"],
  ["svelte", "svelte"],
  ["remix", "remix"],
  ["vite", "vite"],
]);

const CONFIG_NAME_FRAMEWORKS: ReadonlyMap<string, string> = new Map([
  ["angular.json", "angular"],
  ["nest-cli.json", "nest"],
  ["manage.py", "django"],
  ["artisan", "laravel"],
]);

const CONFIG_STEM_TEST_RUNNERS: ReadonlyMap<string, string> = new Map([
  ["vitest", "vitest"],
  ["jest", "jest"],
  ["cypress", "cypress"],
  ["playwright", "playwright"],
  ["karma", "karma"],
]);

const CONFIG_NAME_MONOREPO: ReadonlyMap<string, string> = new Map([
  ["nx.json", "nx"],
  ["turbo.json", "turborepo"],
  ["lerna.json", "lerna"],
  ["pnpm-workspace.yaml", "pnpm-workspaces"],
  ["rush.json", "rush"],
]);

/** Manifest basename → the language it attests. */
const MANIFEST_LANGUAGES: ReadonlyMap<string, StackLanguage> = new Map([
  ["package.json", "javascript"],
  ["tsconfig.json", "typescript"],
  ["pyproject.toml", "python"],
  ["requirements.txt", "python"],
  ["Pipfile", "python"],
  ["setup.py", "python"],
  ["go.mod", "go"],
  ["Cargo.toml", "rust"],
  ["pom.xml", "java"],
  ["build.gradle", "java"],
  ["build.gradle.kts", "java"],
  ["Gemfile", "ruby"],
  ["composer.json", "php"],
]);

/** Manifest basenames the walk should read for {@link detectStack}. */
export const STACK_MANIFEST_NAMES: ReadonlySet<string> = new Set(
  MANIFEST_LANGUAGES.keys(),
);

function basename(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const slash = normalized.lastIndexOf("/");
  return slash === -1 ? normalized : normalized.slice(slash + 1);
}

/** `vite.config.ts` → `vite`; `angular.json` → undefined (not a `.config.` file). */
function configStem(name: string): string | undefined {
  const match = /^(.+)\.config\.(?:[cm]?[jt]sx?|json|mjs|ts)$/.exec(name);
  return match?.[1];
}

function parseJson(content: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // A manifest we cannot parse is evidence we do not have, not a failure.
  }
  return undefined;
}

/** Dependency names from a `package.json`-shaped object. */
function packageJsonDependencies(pkg: Record<string, unknown>): string[] {
  const names: string[] = [];
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const block = pkg[field];
    if (typeof block === "object" && block !== null && !Array.isArray(block)) {
      names.push(...Object.keys(block as Record<string, unknown>));
    }
  }
  return names;
}

/**
 * Dependency-ish tokens from a non-JSON manifest.
 *
 * TOML, `go.mod`, `requirements.txt`, `Gemfile` and `pom.xml` differ in
 * everything except the part this detector needs: a package name appears as a
 * bare token on its own line. Reading them as line-oriented token soup keeps one
 * cheap code path instead of five parsers, and a spurious token can only ever
 * match a name already in the tables above.
 */
function looseManifestTokens(content: string): string[] {
  const tokens: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith("//")) {
      continue;
    }
    for (const token of line.match(/[A-Za-z0-9_.@/-]+/g) ?? []) {
      tokens.push(token.toLowerCase());
    }
  }
  return tokens;
}

/** Every dependency-ish name across every manifest, lowercased. */
function collectDependencyNames(manifests: ReadonlyMap<string, string>): {
  names: Set<string>;
  hasWorkspaces: boolean;
} {
  const names = new Set<string>();
  let hasWorkspaces = false;

  for (const [path, content] of manifests) {
    const name = basename(path);
    if (name === "package.json" || name === "composer.json") {
      const pkg = parseJson(content);
      if (!pkg) {
        continue;
      }
      for (const dep of packageJsonDependencies(pkg)) {
        names.add(dep.toLowerCase());
      }
      if (Array.isArray(pkg.workspaces) || typeof pkg.workspaces === "object") {
        hasWorkspaces = true;
      }
      continue;
    }
    for (const token of looseManifestTokens(content)) {
      names.add(token);
      // `github.com/gin-gonic/gin/v2` also answers to its unversioned path.
      const unversioned = token.replace(/\/v\d+$/, "");
      if (unversioned !== token) {
        names.add(unversioned);
      }
    }
  }

  return { names, hasWorkspaces };
}

function lookupAll(
  names: ReadonlySet<string>,
  table: ReadonlyMap<string, string>,
): string[] {
  const found = new Set<string>();
  for (const [dep, id] of table) {
    if (names.has(dep)) {
      found.add(id);
    }
  }
  return [...found].sort();
}

function languagesFrom(
  manifests: ReadonlyMap<string, string>,
  paths: readonly string[],
): StackLanguage[] {
  const found = new Set<StackLanguage>();
  for (const path of manifests.keys()) {
    const language = MANIFEST_LANGUAGES.get(basename(path));
    if (language) {
      found.add(language);
    }
  }
  for (const path of paths) {
    const language = MANIFEST_LANGUAGES.get(basename(path));
    if (language) {
      found.add(language);
    }
  }
  // TypeScript subsumes JavaScript for the persona: a repo with a tsconfig is a
  // TypeScript repo, even though its package.json is what proved it has deps.
  if (found.has("typescript")) {
    found.delete("javascript");
  }
  return [...found].sort();
}

/**
 * Deterministic stack profile from manifests and file presence.
 *
 * Never throws: unparseable manifests, an empty repo, and a tree of nothing but
 * assets all resolve to a profile — with `confidence: "none"` when there was
 * nothing to read. Callers gate on the confidence, not on a thrown error.
 */
export function detectStack(input: DetectStackInput = {}): StackProfile {
  const manifests = input.manifests ?? new Map<string, string>();
  const paths = input.paths ?? [];

  const { names, hasWorkspaces } = collectDependencyNames(manifests);

  const frameworks = new Set(lookupAll(names, FRAMEWORK_DEPS));
  const testRunners = new Set(lookupAll(names, TEST_RUNNER_DEPS));
  const styling = new Set(lookupAll(names, STYLING_DEPS));
  const orms = lookupAll(names, ORM_DEPS);
  const monorepoTools = lookupAll(names, MONOREPO_DEPS);
  const frameworkFromDeps = frameworks.size > 0;

  let packageManager: string | undefined;
  let monorepoTool: string | undefined = monorepoTools[0];

  for (const path of paths) {
    const name = basename(path);

    // Only a root lockfile names the repo package manager; a lockfile checked
    // into a fixture directory speaks for that fixture, not for this repo.
    if (!path.replaceAll("\\", "/").includes("/")) {
      const manager = LOCKFILE_MANAGERS.get(name);
      if (manager && packageManager === undefined) {
        packageManager = manager;
      }
    }

    const named = CONFIG_NAME_FRAMEWORKS.get(name);
    if (named) {
      frameworks.add(named);
    }
    const stem = configStem(name);
    if (stem) {
      const stemFramework = CONFIG_STEM_FRAMEWORKS.get(stem);
      if (stemFramework) {
        frameworks.add(stemFramework);
      }
      const stemRunner = CONFIG_STEM_TEST_RUNNERS.get(stem);
      if (stemRunner) {
        testRunners.add(stemRunner);
      }
      if (stem === "tailwind") {
        styling.add("tailwind");
      }
    }
    const mono = CONFIG_NAME_MONOREPO.get(name);
    if (mono && monorepoTool === undefined) {
      monorepoTool = mono;
    }
  }

  if (monorepoTool === undefined && hasWorkspaces) {
    monorepoTool = `${packageManager ?? "npm"}-workspaces`;
  }

  const profile = {
    languages: languagesFrom(manifests, paths),
    frameworks: [...frameworks].sort(),
    packageManager,
    testRunners: [...testRunners].sort(),
    orm: orms[0],
    styling: [...styling].sort(),
    monorepoTool,
  };

  return { ...profile, confidence: confidenceFor(profile, frameworkFromDeps) };
}

/**
 * How much the persona may claim.
 *
 * `high` needs a framework the manifests named, not one inferred from a config
 * file sitting in the tree — the persona says "this repo is Next.js App Router",
 * and that sentence has to be earned by a declared dependency.
 */
function confidenceFor(
  profile: Omit<StackProfile, "confidence">,
  frameworkFromDeps: boolean,
): StackConfidence {
  const hasLanguage = profile.languages.length > 0;
  if (frameworkFromDeps && hasLanguage) {
    return "high";
  }
  if (hasLanguage || profile.frameworks.length > 0) {
    return "medium";
  }
  if (profile.packageManager !== undefined || profile.testRunners.length > 0) {
    return "low";
  }
  return "none";
}
