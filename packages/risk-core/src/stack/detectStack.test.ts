import { describe, expect, it } from "vitest";
import { detectStack } from "./detectStack";

function manifests(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

function packageJson(body: Record<string, unknown>): string {
  return JSON.stringify(body);
}

describe("detectStack", () => {
  it("reads a Next.js app from its dependencies and lockfile", () => {
    const profile = detectStack({
      manifests: manifests({
        "package.json": packageJson({
          dependencies: { next: "14.2.0", react: "18.3.1", "@prisma/client": "5.0.0" },
          devDependencies: { tailwindcss: "3.4.0", vitest: "2.0.0", typescript: "5.5.0" },
        }),
        "tsconfig.json": "{}",
      }),
      paths: ["package.json", "tsconfig.json", "pnpm-lock.yaml", "next.config.mjs"],
    });

    expect(profile.frameworks).toContain("next");
    expect(profile.frameworks).toContain("react");
    expect(profile.orm).toBe("prisma");
    expect(profile.packageManager).toBe("pnpm");
    expect(profile.styling).toContain("tailwind");
    expect(profile.testRunners).toContain("vitest");
    expect(profile.languages).toEqual(["typescript"]);
    expect(profile.confidence).toBe("high");
  });

  it("returns a low-confidence profile for an empty repo, and does not throw", () => {
    expect(detectStack()).toMatchObject({
      languages: [],
      frameworks: [],
      testRunners: [],
      styling: [],
      confidence: "none",
    });
    expect(detectStack({ manifests: new Map(), paths: [] }).confidence).toBe("none");
  });

  it("treats an unparseable manifest as missing evidence, not a failure", () => {
    const profile = detectStack({
      manifests: manifests({ "package.json": "{ this is not json" }),
      paths: ["package.json"],
    });

    expect(profile.frameworks).toEqual([]);
    // `package.json` still attests the language even when its body is garbage.
    expect(profile.languages).toEqual(["javascript"]);
    expect(profile.confidence).toBe("medium");
  });

  it("does not reach high confidence on a config file alone", () => {
    // A stray `vite.config.ts` with no matching dependency is weak evidence:
    // the persona must not claim a framework nothing declared.
    const profile = detectStack({ paths: ["vite.config.ts"] });

    expect(profile.frameworks).toEqual(["vite"]);
    expect(profile.confidence).toBe("medium");
  });

  it("reads Python and Go manifests as line-oriented tokens", () => {
    const python = detectStack({
      manifests: manifests({ "requirements.txt": "Django==5.0.1\npytest==8.0\n# comment" }),
      paths: ["requirements.txt", "manage.py", "poetry.lock"],
    });
    expect(python.frameworks).toContain("django");
    expect(python.orm).toBe("django-orm");
    expect(python.testRunners).toContain("pytest");
    expect(python.languages).toEqual(["python"]);

    const go = detectStack({
      manifests: manifests({
        "go.mod": "module example.com/api\n\nrequire github.com/gin-gonic/gin v1.9.1\n",
      }),
      paths: ["go.mod", "go.sum"],
    });
    expect(go.frameworks).toEqual(["gin"]);
    expect(go.packageManager).toBe("go");
    expect(go.languages).toEqual(["go"]);
  });

  it("ignores a lockfile that is not at the repo root", () => {
    // A lockfile inside a fixture speaks for that fixture, not for this repo.
    const profile = detectStack({ paths: ["fixtures/noisy-app/package-lock.json"] });

    expect(profile.packageManager).toBeUndefined();
  });

  it("names the monorepo tool from a workspace declaration", () => {
    const profile = detectStack({
      manifests: manifests({
        "package.json": packageJson({ workspaces: ["packages/*"], devDependencies: {} }),
      }),
      paths: ["package.json", "package-lock.json"],
    });

    expect(profile.monorepoTool).toBe("npm-workspaces");
  });
});
