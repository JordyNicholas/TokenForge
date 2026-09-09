import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyPolicy } from "./apply";

const NEXT_PACKAGE_JSON = JSON.stringify({
  name: "web",
  dependencies: { next: "14.2.0", react: "18.3.1", "@prisma/client": "5.19.0" },
  devDependencies: { tailwindcss: "3.4.0" },
});

const NEXT_APP: Record<string, string> = {
  "package.json": NEXT_PACKAGE_JSON,
  "tsconfig.json": "{}",
  "app/page.tsx": "export default function Page() { return null; }\n",
  "app/layout.tsx": "export default function Layout() { return null; }\n",
  "app/api/users/route.ts": "export function GET() { return null; }\n",
  "src/components/Button.tsx": "export const Button = () => null;\n",
  "src/services/billing.ts": "export const bill = () => 1;\n",
  "src/utils/formatDate.ts": "export const formatDate = () => 1;\n",
  "docs/guide.md": "# Guide\n",
};

async function repoWith(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tokenforge-scoped-"));
  for (const [file, body] of Object.entries(files)) {
    const abs = join(root, file);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, body, "utf8");
  }
  await mkdir(join(root, ".tokenforge"), { recursive: true });
  await writeFile(
    join(root, ".tokenforge", "scan-report.json"),
    JSON.stringify({
      source: "cli",
      timestamp: new Date().toISOString(),
      repo: "web",
      team: "web",
      provider: "cursor",
      findings: [
        {
          path: "public/hero.png",
          reason: "high_risk_filetype",
          bytes: 900_000,
          estTokens: 220_000,
          action: "excluded",
        },
      ],
      totals: {
        beforeTokens: 240_000,
        afterTokens: 20_000,
        savedTokens: 220_000,
        savedPercent: 91.7,
      },
    }),
    "utf8",
  );
  return root;
}

async function rulesDir(root: string): Promise<string[]> {
  try {
    return (await readdir(join(root, ".cursor", "rules"))).sort();
  } catch {
    return [];
  }
}

describe("Cursor glob-scoped reasoning rules (F26 S8)", () => {
  it("writes one rule file per role cluster, each scoped by globs", async () => {
    const root = await repoWith(NEXT_APP);
    await applyPolicy({ root, provider: "cursor", reasoningPack: "roles" });

    const files = (await rulesDir(root)).filter((name) =>
      name.startsWith("tokenforge-reasoning-"),
    );
    expect(files).toContain("tokenforge-reasoning-routes.mdc");
    expect(files).toContain("tokenforge-reasoning-shared-components.mdc");

    const routes = await readFile(
      join(root, ".cursor", "rules", "tokenforge-reasoning-routes.mdc"),
      "utf8",
    );
    expect(routes).toContain("globs: app/**");
    // Without this the rule joins the always-on stack and the scoping buys
    // nothing - it is the whole point of delivering the table this way.
    expect(routes).toContain("alwaysApply: false");
    expect(routes).toContain("description: Reasoning approach for");
    expect(routes).toContain("Sketch two or three ways");
  });

  it("keeps the routing table out of the always-on rule file", async () => {
    const root = await repoWith(NEXT_APP);
    await applyPolicy({ root, provider: "cursor", reasoningPack: "roles+persona" });

    const alwaysOn = await readFile(
      join(root, ".cursor", "rules", "tokenforge.mdc"),
      "utf8",
    );
    // The persona is repo-wide and has nowhere else to go; the table does.
    expect(alwaysOn).toContain("This repo is built with Next.js");
    expect(alwaysOn).not.toContain("| Path | Approach |");
    expect(alwaysOn).not.toContain("Sketch two or three ways");
  });

  it("carries no timestamp, so a second apply changes nothing", async () => {
    const root = await repoWith(NEXT_APP);
    const read = () =>
      readFile(
        join(root, ".cursor", "rules", "tokenforge-reasoning-routes.mdc"),
        "utf8",
      );

    await applyPolicy({ root, provider: "cursor", reasoningPack: "roles" });
    const first = await read();
    await applyPolicy({ root, provider: "cursor", reasoningPack: "roles" });

    expect(await read()).toBe(first);
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("writes no scoped files when the pack is off", async () => {
    const root = await repoWith(NEXT_APP);
    await applyPolicy({ root, provider: "cursor", reasoningPack: "off" });

    expect(
      (await rulesDir(root)).filter((name) =>
        name.startsWith("tokenforge-reasoning-"),
      ),
    ).toEqual([]);
  });
});

describe("stale scoped-rule pruning (F26 S10)", () => {
  it("removes a rule whose directories are gone, and leaves hand-written rules alone", async () => {
    const root = await repoWith(NEXT_APP);
    await applyPolicy({ root, provider: "cursor", reasoningPack: "roles" });
    expect(await rulesDir(root)).toContain("tokenforge-reasoning-utils.mdc");

    // A rule file from an earlier run whose role no longer exists, beside a
    // rule the repo owner wrote.
    await writeFile(
      join(root, ".cursor", "rules", "tokenforge-reasoning-state.mdc"),
      "---\nglobs: src/store/**\n---\nStale.\n",
      "utf8",
    );
    await writeFile(
      join(root, ".cursor", "rules", "house-style.mdc"),
      "---\nalwaysApply: true\n---\nUse tabs.\n",
      "utf8",
    );

    const result = await applyPolicy({
      root,
      provider: "cursor",
      reasoningPack: "roles",
    });
    const after = await rulesDir(root);

    expect(after).not.toContain("tokenforge-reasoning-state.mdc");
    expect(result.removedFiles).toContain(
      ".cursor/rules/tokenforge-reasoning-state.mdc",
    );
    // Only files carrying this tool's own prefix are eligible.
    expect(after).toContain("house-style.mdc");
    expect(after).toContain("tokenforge-reasoning-routes.mdc");
  });

  it("removes nothing under --dry-run, but reports what it would", async () => {
    const root = await repoWith(NEXT_APP);
    await applyPolicy({ root, provider: "cursor", reasoningPack: "roles" });
    await writeFile(
      join(root, ".cursor", "rules", "tokenforge-reasoning-state.mdc"),
      "---\nglobs: src/store/**\n---\nStale.\n",
      "utf8",
    );

    const result = await applyPolicy({
      root,
      provider: "cursor",
      reasoningPack: "roles",
      dryRun: true,
    });

    expect(result.removedFiles).toContain(
      ".cursor/rules/tokenforge-reasoning-state.mdc",
    );
    expect(await rulesDir(root)).toContain("tokenforge-reasoning-state.mdc");
  });
});

describe("single-file providers still carry the table (F26 S9)", () => {
  it.each(["copilot", "claude", "gemini"] as const)(
    "%s writes the block inside the managed markers",
    async (provider) => {
      const root = await repoWith(NEXT_APP);
      const result = await applyPolicy({ root, provider, reasoningPack: "roles" });

      const instructionFile = result.resolvedFiles.find((file) =>
        file.contents.includes("## How to reason about this repo"),
      );
      expect(instructionFile).toBeDefined();

      const body = instructionFile!.contents;
      const begin = body.indexOf("<!-- tokenforge:begin -->");
      const end = body.indexOf("<!-- tokenforge:end -->");
      const section = body.indexOf("## How to reason about this repo");
      expect(begin).toBeGreaterThanOrEqual(0);
      expect(section).toBeGreaterThan(begin);
      expect(section).toBeLessThan(end);
      expect(body).toContain("| Path | Approach |");

      // No provider but Cursor gets scoped files.
      expect(
        (await rulesDir(root)).filter((name) =>
          name.startsWith("tokenforge-reasoning-"),
        ),
      ).toEqual([]);
    },
  );

  it("leaves user text outside the markers untouched", async () => {
    const root = await repoWith(NEXT_APP);
    await mkdir(join(root, ".github"), { recursive: true });
    await writeFile(
      join(root, ".github", "copilot-instructions.md"),
      "# Team notes\n\nAlways run the linter.\n",
      "utf8",
    );

    await applyPolicy({ root, provider: "copilot", reasoningPack: "roles" });
    const body = await readFile(
      join(root, ".github", "copilot-instructions.md"),
      "utf8",
    );

    expect(body).toContain("# Team notes");
    expect(body).toContain("Always run the linter.");
    expect(body).toContain("## How to reason about this repo");
  });
});
