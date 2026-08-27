import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TOKEN_RISK_REPORT_SCHEMA_ID } from "../domain/constants";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const docsRoot = resolve(repoRoot, "docs");

/**
 * Frozen predecessors are always referenced by file path
 * (`risk-event.v3.schema.json`); the `$id` URL form is reserved for the live
 * contract. That convention is what makes this rule unambiguous — a doc naming
 * a version this way is claiming it is the current one.
 */
const SCHEMA_ID_URL = /https:\/\/tokenforge\.dev\/schema\/risk-event\/v\d+/g;

/** Docs that must keep citing the contract, so the sweep cannot pass vacuously. */
const CONTRACT_DOCS = [
  "design/SOLUTION_DESIGN.md",
  "adapters/EXTENSION_CONTEXT_GUARD.md",
];

function markdownFiles(): string[] {
  return readdirSync(docsRoot, { recursive: true, encoding: "utf8" })
    .map((entry) => entry.replace(/\\/g, "/"))
    .filter((entry) => entry.endsWith(".md"))
    // docs/schemas/ holds the frozen files themselves; their own $id is correct.
    .filter((entry) => !entry.startsWith("schemas/"));
}

function read(relativePath: string): string {
  return readFileSync(resolve(docsRoot, relativePath), "utf8");
}

describe("live schema version cited in docs", () => {
  const files = markdownFiles();

  it("finds markdown to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("is the only version any doc names", () => {
    // Collected rather than asserted per file so a failure names every stale
    // citation at once — the previous drift spanned two docs and three bumps.
    const stale = files.flatMap((file) =>
      (read(file).match(SCHEMA_ID_URL) ?? [])
        .filter((url) => url !== TOKEN_RISK_REPORT_SCHEMA_ID)
        .map((url) => `docs/${file} cites ${url}`),
    );

    expect(stale).toEqual([]);
  });

  it("is cited by the contract docs", () => {
    const citing = files.filter((file) =>
      read(file).includes(TOKEN_RISK_REPORT_SCHEMA_ID),
    );

    expect(citing).toEqual(expect.arrayContaining(CONTRACT_DOCS));
  });
});
