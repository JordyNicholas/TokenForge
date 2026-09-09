import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyPolicy } from "./apply";

const NEXT_PACKAGE_JSON = JSON.stringify({
  name: "web",
  dependencies: { next: "14.2.0", react: "18.3.1", "@prisma/client": "5.19.0" },
  devDependencies: { tailwindcss: "3.4.0", vitest: "2.0.5" },
});

/**
 * A repo with enough shape to clear the emission gate: five role-bearing
 * directories across five distinct roles.
 */
const NEXT_APP: Record<string, string> = {
  "package.json": NEXT_PACKAGE_JSON,
  "tsconfig.json": "{}",
  "pnpm-lock.yaml": "lockfileVersion: 9\n",
  "app/page.tsx": "export default function Page() { return null; }\n",
  "app/layout.tsx": "export default function Layout() { return null; }\n",
  "app/api/users/route.ts": "export function GET() { return null; }\n",
  "src/components/Button.tsx": "export const Button = () => null;\n",
  "src/services/billing.ts": "export const bill = () => 1;\n",
  "src/utils/formatDate.ts": "export const formatDate = () => 1;\n",
  "docs/guide.md": "# Guide\n",
};

async function repoWith(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tokenforge-apply-reasoning-"));
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
      provider: "copilot",
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

async function instructionsAfterApply(
  files: Record<string, string>,
  reasoningPack?: string,
): Promise<string> {
  const root = await repoWith(files);
  await applyPolicy({ root, provider: "copilot", reasoningPack });
  return readFile(join(root, ".github", "copilot-instructions.md"), "utf8");
}

describe("apply --reasoning-pack (F26 S6/S7)", () => {
  it("writes the routing table by default, and no persona", async () => {
    const body = await instructionsAfterApply(NEXT_APP);

    expect(body).toContain("## How to reason about this repo");
    expect(body).toContain("| Path | Approach |");
    expect(body).toContain("`app/**`");
    expect(body).toContain("`src/components/**`");
    // Persona is the half that can clash with a voice the author chose, so it
    // is opt-in even though the table is not.
    expect(body).not.toContain("This repo is built with");
  });

  it("adds the persona only when asked for it", async () => {
    const body = await instructionsAfterApply(NEXT_APP, "roles+persona");

    expect(body).toContain("This repo is built with Next.js and React on TypeScript.");
    expect(body).toContain("Prisma owns the data layer");
  });

  it("writes nothing when the pack is off", async () => {
    const body = await instructionsAfterApply(NEXT_APP, "off");

    expect(body).not.toContain("## How to reason about this repo");
    // The rest of the pack is untouched.
    expect(body).toContain("Do not load");
  });

  it("never writes a reasoning-strategy label", async () => {
    const body = (await instructionsAfterApply(NEXT_APP, "roles+persona")).toLowerCase();

    expect(body).not.toContain("chain of thought");
    expect(body).not.toContain("tree of thought");
    expect(body).not.toContain("step by step");
  });

  it("stays silent on a repo with too little shape", async () => {
    const body = await instructionsAfterApply({
      "package.json": NEXT_PACKAGE_JSON,
      "src/index.ts": "export const x = 1;\n",
      "docs/readme.md": "# hi\n",
    });

    expect(body).not.toContain("## How to reason about this repo");
  });

  it("writes the same persona on a second apply", async () => {
    // A previous managed section is our own output, not the author voice. If
    // it counted as an existing persona the line would appear on the first run
    // and vanish on the second, which is worse than either answer.
    const root = await repoWith(NEXT_APP);
    const read = () =>
      readFile(join(root, ".github", "copilot-instructions.md"), "utf8");

    await applyPolicy({ root, provider: "copilot", reasoningPack: "roles+persona" });
    const first = await read();
    await applyPolicy({ root, provider: "copilot", reasoningPack: "roles+persona" });
    const second = await read();

    expect(first).toContain("This repo is built with");
    expect(second).toContain("This repo is built with");
    expect(second).toBe(first);
  });

  it("keeps its persona out of a repo that already has one", async () => {
    const root = await repoWith(NEXT_APP);
    await mkdir(join(root, ".github"), { recursive: true });
    await writeFile(
      join(root, ".github", "copilot-instructions.md"),
      "# House rules\n\nYou are a staff engineer who values brevity.\n",
      "utf8",
    );

    await applyPolicy({ root, provider: "copilot", reasoningPack: "roles+persona" });
    const body = await readFile(
      join(root, ".github", "copilot-instructions.md"),
      "utf8",
    );

    expect(body).toContain("You are a staff engineer who values brevity.");
    expect(body).toContain("| Path | Approach |");
    expect(body).not.toContain("This repo is built with");
  });
});
