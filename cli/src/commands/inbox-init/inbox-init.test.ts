import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { initInbox } from "./inbox-init";
import { ROSTER_FILE } from "../../io/roster";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function tempRoot(prefix: string): string {
  const root = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  roots.push(root);
  return root;
}

describe("initInbox", () => {
  it("writes inbox README and optional roster stub", async () => {
    const root = tempRoot("tf-inbox-init");
    const result = await initInbox({ root, withRoster: true, businessUnit: "Retail" });

    expect(result.readmePath).toBe(join(root, "inbox", "README.md"));
    const readme = await readFile(result.readmePath, "utf8");
    expect(readme).toContain(".tokenforge/");
    expect(readme).toContain("{team}/");

    expect(result.rosterPath).toBe(join(root, ROSTER_FILE));
    const rosterRaw = await readFile(result.rosterPath!, "utf8");
    const roster = JSON.parse(rosterRaw) as { schemaVersion: number; businessUnit?: string };
    expect(roster.schemaVersion).toBe(1);
    expect(roster.businessUnit).toBe("Retail");
  });
});
