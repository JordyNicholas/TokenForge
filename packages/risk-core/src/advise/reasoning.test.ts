import { describe, expect, it } from "vitest";
import {
  MAX_REASONING_SECTION_BYTES,
  MIN_REASONING_DISTINCT_ROLES,
} from "../domain/constants";
import type { DirectoryRole, DirectoryRoleAssignment, StackProfile } from "../domain/types";
import { ROLE_RULES, hasStrategyVocabulary } from "../stack/roles";
import {
  REASONING_SECTION_HEADING,
  buildReasoningSection,
  hasExistingPersona,
  meetsReasoningEmissionGate,
  personaLines,
} from "./reasoning";

const NEXT_STACK: StackProfile = {
  languages: ["typescript"],
  frameworks: ["next", "react"],
  packageManager: "pnpm",
  testRunners: ["vitest"],
  orm: "prisma",
  styling: ["tailwind"],
  confidence: "high",
};

function assignment(dir: string, role: DirectoryRole): DirectoryRoleAssignment {
  const spec = ROLE_RULES[role];
  return {
    dir,
    globs: [`${dir}/**`],
    role,
    strategy: spec.strategy,
    rule: spec.rule,
    signal: "name",
    language: "typescript",
    sampleFiles: [],
  };
}

/** Five directories across three roles — the smallest tree that clears the gate. */
const ROLES: DirectoryRoleAssignment[] = [
  assignment("app", "routes"),
  assignment("src/components", "shared_components"),
  assignment("src/services", "domain"),
  assignment("src/utils", "utils"),
  assignment("docs", "docs"),
];

function section(overrides: Partial<Parameters<typeof buildReasoningSection>[0]> = {}) {
  return buildReasoningSection({
    stackProfile: NEXT_STACK,
    directoryRoles: ROLES,
    mode: "roles",
    ...overrides,
  });
}

describe("buildReasoningSection", () => {
  it("renders the heading and a row per role-bearing directory", () => {
    const text = section();

    expect(text).toBeDefined();
    expect(text).toContain(REASONING_SECTION_HEADING);
    expect(text).toContain("| Path | Approach |");
    expect(text).toContain("`app/**`");
    expect(text).toContain("`src/components/**`");
  });

  it("writes no strategy label anywhere in the rendered text", () => {
    // The behaviour is the payload. A label invites generic preamble and costs
    // budget saying nothing the rule does not already say.
    const text = section({ mode: "roles+persona" }) ?? "";

    expect(hasStrategyVocabulary(text)).toBe(false);
    expect(text.toLowerCase()).not.toContain("chain of thought");
    expect(text.toLowerCase()).not.toContain("tree of thought");
  });

  it("stays inside its own sub-budget", () => {
    const text = section({ mode: "roles+persona" }) ?? "";

    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(
      MAX_REASONING_SECTION_BYTES,
    );
  });

  it("drops the least valuable roles first when it will not fit", () => {
    const wide = [
      assignment("app", "routes"),
      assignment("src/services", "domain"),
      assignment("src/db", "data"),
      assignment("src/api", "api"),
      assignment("src/store", "state"),
      assignment("src/components", "shared_components"),
      assignment("scripts", "infra"),
      assignment("tests", "tests"),
      assignment("src/types", "types"),
      assignment("docs", "docs"),
      assignment("src/utils", "utils"),
    ];

    const text = section({ directoryRoles: wide }) ?? "";

    expect(text).toContain("`app/**`");
    expect(text).toContain("`src/services/**`");
    // Trimming by table position would have kept these and dropped the routes
    // and domain rows that actually carry the guidance.
    expect(text).not.toContain("`src/utils/**`");
    expect(text).not.toContain("`docs/**`");
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(
      MAX_REASONING_SECTION_BYTES,
    );
  });

  it("says nothing when the mode is off", () => {
    expect(section({ mode: "off" })).toBeUndefined();
  });

  it("says nothing when the inputs are missing", () => {
    expect(buildReasoningSection({ mode: "roles" })).toBeUndefined();
    expect(
      buildReasoningSection({ mode: "roles", directoryRoles: [] }),
    ).toBeUndefined();
  });
});

describe("monorepo grouping", () => {
  const MONOREPO: DirectoryRoleAssignment[] = [
    assignment("apps/web/app", "routes"),
    assignment("apps/web/components", "shared_components"),
    assignment("apps/web/store", "state"),
    assignment("apps/web/utils", "utils"),
    assignment("apps/web/types", "types"),
    assignment("packages/api/handlers", "api"),
    assignment("packages/api/db", "data"),
  ];

  it("caps rows per package so every package gets a voice", () => {
    const text =
      section({
        directoryRoles: MONOREPO,
        stackProfile: { ...NEXT_STACK, monorepoTool: "pnpm-workspaces" },
      }) ?? "";

    // Ranking by role value alone, `apps/` would spend the budget before
    // `packages/` said anything at all.
    expect(text).toContain("`packages/api/handlers/**`");
    expect(text).toContain("`packages/api/db/**`");
    expect(text).toContain("`apps/web/app/**`");
    const appsRows = (text.match(/^\| `apps\//gm) ?? []).length;
    expect(appsRows).toBeLessThanOrEqual(4);
  });

  it("does not cap an ordinary single-package repo", () => {
    // Here the top-level directories are `src/` and `docs/`, not packages.
    // Capping `src/` would truncate a normal repo for no reason.
    const single = [
      assignment("src/app", "routes"),
      assignment("src/services", "domain"),
      assignment("src/db", "data"),
      assignment("src/api", "api"),
      assignment("src/store", "state"),
    ];
    const text = section({ directoryRoles: single, mode: "roles" }) ?? "";

    expect(text).toContain("`src/store/**`");
  });
});

describe("emission gate", () => {
  it("needs enough directories and enough distinct roles", () => {
    expect(meetsReasoningEmissionGate(ROLES)).toBe(true);
    // Five directories, but only one thing to say about them.
    expect(
      meetsReasoningEmissionGate([
        assignment("a", "utils"),
        assignment("b", "utils"),
        assignment("c", "utils"),
        assignment("d", "utils"),
        assignment("e", "utils"),
      ]),
    ).toBe(false);
    // Three roles, too few directories to be routing anything.
    expect(meetsReasoningEmissionGate(ROLES.slice(0, MIN_REASONING_DISTINCT_ROLES))).toBe(
      false,
    );
  });

  it("keeps a tiny repo silent", () => {
    const tiny = [assignment("src", "domain"), assignment("docs", "docs")];

    expect(section({ directoryRoles: tiny })).toBeUndefined();
  });
});

describe("persona", () => {
  it("is absent by default and present only in roles+persona", () => {
    expect(section({ mode: "roles" })).not.toContain("This repo is built with");
    expect(section({ mode: "roles+persona" })).toContain(
      "This repo is built with Next.js and React on TypeScript.",
    );
  });

  it("earns each line from a declared dependency", () => {
    expect(personaLines(NEXT_STACK)).toEqual([
      "This repo is built with Next.js and React on TypeScript.",
      "Prisma owns the data layer — do not hand-write SQL.",
      "Styling is Tailwind utility classes — follow what neighbouring files do.",
    ]);

    // No ORM declared, so the pack makes no claim about the data layer.
    const noOrm = personaLines({ ...NEXT_STACK, orm: undefined, styling: [] });
    expect(noOrm).toEqual(["This repo is built with Next.js and React on TypeScript."]);
  });

  it("claims nothing when the stack was not confidently read", () => {
    expect(
      personaLines({
        languages: [],
        frameworks: [],
        testRunners: [],
        styling: [],
        confidence: "none",
      }),
    ).toEqual([]);
  });

  it("states facts about the repo, never an identity", () => {
    for (const line of personaLines(NEXT_STACK)) {
      expect(line.toLowerCase().startsWith("you are")).toBe(false);
      expect(line.toLowerCase().startsWith("act as")).toBe(false);
    }
  });

  it("stands down when the repo already has a persona of its own", () => {
    const text = section({
      mode: "roles+persona",
      existingInstructionTexts: [
        "# House rules\n\nYou are a staff engineer who values brevity.\n",
      ],
    });

    expect(text).toBeDefined();
    expect(text).toContain("| Path | Approach |");
    expect(text).not.toContain("This repo is built with");
  });
});

describe("hasExistingPersona", () => {
  it("recognises the common openings, in both languages", () => {
    expect(hasExistingPersona("You are a senior Go engineer.")).toBe(true);
    expect(hasExistingPersona("Act as the reviewer for this repo.")).toBe(true);
    expect(hasExistingPersona("## Persona\n\nTerse, direct.")).toBe(true);
    expect(hasExistingPersona("Your role is to review diffs.")).toBe(true);
    expect(hasExistingPersona("Você é um engenheiro sênior.")).toBe(true);
  });

  it("does not mistake ordinary guidance for a persona", () => {
    expect(hasExistingPersona("Do not load lockfiles into context.")).toBe(false);
    expect(hasExistingPersona("Prefer living source under `src/`.")).toBe(false);
    expect(hasExistingPersona(undefined)).toBe(false);
    expect(hasExistingPersona("   ")).toBe(false);
  });
});
