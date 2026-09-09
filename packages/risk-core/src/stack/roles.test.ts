import { describe, expect, it } from "vitest";
import { MAX_ROLE_RULE_CHARS } from "../domain/constants";
import type { StackProfile } from "../domain/types";
import {
  REASONING_BREADTH,
  ROLE_RULES,
  hasStrategyVocabulary,
  isRenderableRoleRule,
  resolveDirectoryRoles,
  startsWithImperativeVerb,
  type DirectoryEntry,
} from "./roles";

const TS_STACK: StackProfile = {
  languages: ["typescript"],
  frameworks: ["next", "react"],
  packageManager: "pnpm",
  testRunners: ["vitest"],
  styling: ["tailwind"],
  confidence: "high",
};

function stack(overrides: Partial<StackProfile> = {}): StackProfile {
  return { ...TS_STACK, ...overrides };
}

/** `"src/components"` → an entry holding two TypeScript files. */
function dir(path: string, fileNames: readonly string[] = ["index.ts"]): DirectoryEntry {
  return { dir: path, fileNames };
}

function rolesFor(
  directories: readonly DirectoryEntry[],
  profile: StackProfile = TS_STACK,
  sourceRoots: readonly string[] = [],
): Map<string, { role: string; strategy: string; signal: string }> {
  const assignments = resolveDirectoryRoles({ directories, stack: profile, sourceRoots });
  return new Map(
    assignments.map((a) => [a.dir, { role: a.role, strategy: a.strategy, signal: a.signal }]),
  );
}

describe("resolveDirectoryRoles", () => {
  it("resolves the common TypeScript names", () => {
    const roles = rolesFor([
      dir("src/pages", ["index.tsx", "about.tsx"]),
      dir("src/components", ["Button.tsx", "Card.tsx"]),
      dir("src/utils", ["formatDate.ts"]),
      dir("src/api", ["users.ts"]),
      dir("docs", ["README.md"]),
    ]);

    expect(roles.get("src/pages")).toMatchObject({ role: "routes", strategy: "explore" });
    expect(roles.get("src/components")).toMatchObject({
      role: "shared_components",
      strategy: "linear",
    });
    expect(roles.get("src/utils")).toMatchObject({ role: "utils", strategy: "minimal" });
    expect(roles.get("src/api")).toMatchObject({ role: "api", strategy: "linear" });
    expect(roles.get("docs")).toMatchObject({ role: "docs" });
  });

  it("reads models/ as the data layer only when an ORM owns the schema", () => {
    const withOrm = rolesFor([dir("src/models", ["user.ts"])], stack({ orm: "prisma" }));
    expect(withOrm.get("src/models")).toMatchObject({ role: "data", signal: "stack" });

    const withoutOrm = rolesFor([dir("src/models", ["user.ts"])], stack({ orm: undefined }));
    expect(withoutOrm.get("src/models")).toMatchObject({ role: "domain", signal: "name" });
  });

  it("never gives an uncorroborated ambiguous name the exploratory strategy", () => {
    // `app/` means Next router, Express root, or Android module. With nothing
    // corroborating it, exploring alternative layouts would invite a redesign.
    const bare = rolesFor(
      [dir("app", ["helpers.ts"])],
      stack({ frameworks: ["express"] }),
    );

    expect(bare.get("app")).toMatchObject({ role: "domain", strategy: "linear" });
    expect(bare.get("app")?.strategy).not.toBe("explore");
  });

  it("reads app/ as a router when the files say so, and as a server root otherwise", () => {
    const router = rolesFor(
      [dir("app", ["page.tsx", "layout.tsx"])],
      stack({ frameworks: ["express"] }),
    );
    expect(router.get("app")).toMatchObject({ role: "routes", signal: "shape" });

    const server = rolesFor(
      [dir("app", ["server.ts", "routes.ts"])],
      stack({ frameworks: ["express"] }),
    );
    expect(server.has("app")).toBe(false);
  });

  it("keeps a top-level lib/ source root out of the utils bucket", () => {
    // Telling an agent to stop reasoning inside the primary source tree is the
    // most damaging thing this feature could say, so it says nothing.
    const asRoot = rolesFor([dir("lib", ["engine.ts"])], TS_STACK, ["lib"]);
    expect(asRoot.has("lib")).toBe(false);

    const nested = rolesFor([dir("src/lib", ["clamp.ts"])], TS_STACK, ["src"]);
    expect(nested.get("src/lib")).toMatchObject({ role: "utils" });
  });

  it("treats a feature-local components/ as feature code, not the shared bucket", () => {
    const roles = rolesFor([
      dir("src/components", ["Button.tsx"]),
      dir("src/features/checkout/components", ["Total.tsx"]),
    ]);

    expect(roles.get("src/components")).toMatchObject({ role: "shared_components" });
    expect(roles.get("src/features/checkout/components")).toMatchObject({
      role: "domain",
      signal: "depth",
    });
  });

  it("keeps a nested directory only when it says something different", () => {
    const roles = rolesFor([
      dir("app", ["page.tsx"]),
      dir("app/api", ["route.ts"]),
      dir("app/dashboard", ["page.tsx"]),
    ]);

    expect(roles.get("app")).toMatchObject({ role: "routes" });
    expect(roles.get("app/api")).toMatchObject({ role: "api" });
    // `app/dashboard` is routes too — the ancestor already speaks for it.
    expect(roles.has("app/dashboard")).toBe(false);
  });

  it("lands the rule on the segment that carries the role, not the leaf", () => {
    // A file-system router nests resource names below the meaningful segment:
    // `app/api/users/route.ts` ends in `users`, which means nothing on its own.
    // Matching only the last segment would leave every route directory silent.
    const roles = rolesFor([
      dir("app", ["layout.tsx"]),
      dir("app/api/users", ["route.ts"]),
      dir("app/dashboard/settings", ["page.tsx"]),
      dir("src/components/Button", ["Button.tsx", "Button.test.tsx"]),
    ]);

    expect(roles.get("app")).toMatchObject({ role: "routes" });
    expect(roles.get("app/api")).toMatchObject({ role: "api" });
    expect(roles.has("app/api/users")).toBe(false);
    // `app/dashboard/settings` is routes as well, so the ancestor speaks for it.
    expect(roles.has("app/dashboard/settings")).toBe(false);
    expect(roles.get("src/components")).toMatchObject({ role: "shared_components" });
    expect(roles.has("src/components/Button")).toBe(false);
  });

  it("applies only the language table a directory is written in", () => {
    const polyglot = resolveDirectoryRoles({
      directories: [
        dir("web/src/pages", ["index.tsx"]),
        dir("service/internal", ["server.go"]),
        dir("service/cmd", ["main.go"]),
      ],
      stack: stack({ languages: ["typescript", "go"] }),
    });

    const byDir = new Map(polyglot.map((a) => [a.dir, a]));
    expect(byDir.get("web/src/pages")?.strategy).toBe("explore");
    // `internal/` in Go is a visibility boundary, not a role.
    expect(byDir.has("service/internal")).toBe(false);
    expect(byDir.get("service/cmd")?.language).toBe("go");
    for (const assignment of polyglot) {
      if (assignment.language === "go") {
        expect(assignment.strategy).not.toBe("explore");
      }
    }
  });

  it("carries globs and capped sample files", () => {
    const [assignment] = resolveDirectoryRoles({
      directories: [dir("src/components", ["A.tsx", "B.tsx", "C.tsx", "D.tsx", "styles.css"])],
      stack: TS_STACK,
    });

    expect(assignment?.globs).toEqual(["src/components/**"]);
    expect(assignment?.sampleFiles).toHaveLength(3);
    for (const file of assignment?.sampleFiles ?? []) {
      expect(file.startsWith("src/components/")).toBe(true);
      expect(file.endsWith(".css")).toBe(false);
    }
  });

  it("returns nothing for a repo whose names it does not recognise", () => {
    expect(
      resolveDirectoryRoles({
        directories: [dir("frobnicator", ["a.ts"]), dir("widgetron", ["b.ts"])],
        stack: TS_STACK,
      }),
    ).toEqual([]);
  });
});

describe("rendered rule text", () => {
  it("is short, imperative, and free of strategy vocabulary", () => {
    for (const [role, spec] of Object.entries(ROLE_RULES)) {
      expect(spec.rule.length, `${role} rule length`).toBeLessThanOrEqual(
        MAX_ROLE_RULE_CHARS,
      );
      expect(isRenderableRoleRule(spec.rule), `${role} renderable`).toBe(true);
      expect(startsWithImperativeVerb(spec.rule), `${role} imperative`).toBe(true);
    }
  });

  it("orders reasoning breadth so nothing can be promoted to explore", () => {
    expect(REASONING_BREADTH.explore).toBeGreaterThan(REASONING_BREADTH.linear);
    expect(REASONING_BREADTH.linear).toBeGreaterThan(REASONING_BREADTH.checklist);
    expect(REASONING_BREADTH.checklist).toBeGreaterThan(REASONING_BREADTH.minimal);
  });

  it("rejects descriptive phrasing, long rules, and strategy labels", () => {
    expect(startsWithImperativeVerb("You should keep the contract.")).toBe(false);
    expect(startsWithImperativeVerb("The module protects an invariant.")).toBe(false);
    expect(startsWithImperativeVerb("Keep the contract.")).toBe(true);
    expect(startsWithImperativeVerb("Arrange, act, assert.")).toBe(true);
    expect(isRenderableRoleRule("Think step by step about props.")).toBe(false);
    expect(isRenderableRoleRule(`Keep ${"x".repeat(MAX_ROLE_RULE_CHARS)}`)).toBe(false);
  });

  it("catches strategy vocabulary in both languages", () => {
    expect(hasStrategyVocabulary("Use chain of thought here")).toBe(true);
    expect(hasStrategyVocabulary("Apply Tree-of-Thought reasoning")).toBe(true);
    expect(hasStrategyVocabulary("Think step by step")).toBe(true);
    expect(hasStrategyVocabulary("Pense passo a passo")).toBe(true);
    expect(hasStrategyVocabulary("Work in order: props, states, render.")).toBe(false);
  });
});
