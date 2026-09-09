import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { collectKeptContent } from "./keep-dirs";

/** Build a temp repo from `path → contents`. */
async function repoWith(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tokenforge-reasoning-"));
  for (const [file, body] of Object.entries(files)) {
    const abs = join(root, file);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, body, "utf8");
  }
  return root;
}

function report(excluded: readonly string[]): Pick<TokenRiskReport, "findings"> {
  return {
    findings: excluded.map((path) => ({
      path,
      reason: "oversized" as const,
      bytes: 1,
      estTokens: 1,
      action: "excluded" as const,
    })),
  };
}

const NEXT_PACKAGE_JSON = JSON.stringify({
  name: "web",
  dependencies: { next: "14.2.0", react: "18.3.1", "@prisma/client": "5.19.0" },
  devDependencies: { tailwindcss: "3.4.0", vitest: "2.0.5" },
});

describe("collectKeptContent — reasoning-pack evidence (F26 S4)", () => {
  it("attests the stack and the directory roles from one walk", async () => {
    const root = await repoWith({
      "package.json": NEXT_PACKAGE_JSON,
      "tsconfig.json": "{}",
      "pnpm-lock.yaml": "lockfileVersion: 9\n",
      "next.config.mjs": "export default {};\n",
      "app/page.tsx": "export default function Page() {}\n",
      "app/layout.tsx": "export default function Layout() {}\n",
      "app/api/users/route.ts": "export function GET() {}\n",
      "src/components/Button.tsx": "export const Button = () => null;\n",
      "src/components/Card.tsx": "export const Card = () => null;\n",
      "src/utils/formatDate.ts": "export const formatDate = () => 1;\n",
      "src/models/user.ts": "export type User = { id: string };\n",
      "docs/guide.md": "# Guide\n",
    });

    const { stackProfile, directoryRoles, sourceRoots } = await collectKeptContent(
      root,
      report([]),
    );

    expect(stackProfile.frameworks).toContain("next");
    expect(stackProfile.orm).toBe("prisma");
    expect(stackProfile.packageManager).toBe("pnpm");
    expect(stackProfile.confidence).toBe("high");
    expect(sourceRoots).toContain("src");

    const byDir = new Map(directoryRoles.map((role) => [role.dir, role]));
    expect(byDir.get("app")?.role).toBe("routes");
    // The rule lands on the segment that carries the role, and its glob speaks
    // for the resource directories below it - `users/` is a route name.
    expect(byDir.get("app/api")).toMatchObject({
      role: "api",
      globs: ["app/api/**"],
    });
    expect(byDir.has("app/api/users")).toBe(false);
    expect(byDir.get("src/components")?.role).toBe("shared_components");
    expect(byDir.get("src/utils")?.role).toBe("utils");
    // Prisma is in the dependency list, so `models/` is the data layer.
    expect(byDir.get("src/models")).toMatchObject({ role: "data", signal: "stack" });
    expect(byDir.get("docs")?.role).toBe("docs");
  });

  it("never samples a file the scan excluded", async () => {
    const root = await repoWith({
      "package.json": NEXT_PACKAGE_JSON,
      "src/components/Button.tsx": "export const Button = () => null;\n",
      "src/components/generated.bundle.ts": "// huge\n",
    });

    const { directoryRoles } = await collectKeptContent(
      root,
      report(["src/components/generated.bundle.ts"]),
    );

    const components = directoryRoles.find((role) => role.dir === "src/components");
    expect(components?.sampleFiles).toEqual(["src/components/Button.tsx"]);
  });

  it("caps sample files at three and keeps them repo-relative", async () => {
    const root = await repoWith({
      "package.json": NEXT_PACKAGE_JSON,
      "src/components/A.tsx": "a\n",
      "src/components/B.tsx": "b\n",
      "src/components/C.tsx": "c\n",
      "src/components/D.tsx": "d\n",
      "src/components/E.tsx": "e\n",
    });

    const { directoryRoles } = await collectKeptContent(root, report([]));
    const components = directoryRoles.find((role) => role.dir === "src/components");

    expect(components?.sampleFiles).toHaveLength(3);
    for (const file of components?.sampleFiles ?? []) {
      expect(file.startsWith("src/components/")).toBe(true);
      expect(file.startsWith(root)).toBe(false);
    }
  });

  it("returns an empty, low-confidence profile for a repo with nothing to read", async () => {
    const root = await repoWith({ "assets/logo.png": "binary-ish\n" });

    const { stackProfile, directoryRoles } = await collectKeptContent(root, report([]));

    expect(stackProfile.confidence).toBe("none");
    expect(stackProfile.frameworks).toEqual([]);
    expect(directoryRoles).toEqual([]);
  });

  it("ignores a manifest buried below the evidence depth", async () => {
    // A `package.json` five levels down is a vendored copy or a fixture; it
    // must not decide what the repo persona claims.
    const root = await repoWith({
      "fixtures/demo/nested/deep/inner/package.json": NEXT_PACKAGE_JSON,
    });

    const { stackProfile } = await collectKeptContent(root, report([]));

    expect(stackProfile.frameworks).toEqual([]);
    expect(stackProfile.confidence).toBe("none");
  });

  it("leaves keepDirs and sourceRoots exactly as they were", async () => {
    // The reasoning fields are additive: the exclusion-collapse guard that
    // rides on keepDirs must not shift because F26 landed.
    const root = await repoWith({
      "core/js/tabler.js": "x\n",
      "core/fonts/geist/Geist.ttf": "x\n",
      "package.json": "{}",
    });

    const { keepDirs, sourceRoots } = await collectKeptContent(root, report([]));

    expect(keepDirs.has("core")).toBe(true);
    expect(keepDirs.has("core/js")).toBe(true);
    expect(keepDirs.has("core/fonts/geist")).toBe(false);
    expect(sourceRoots).toEqual(["core"]);
  });
});
