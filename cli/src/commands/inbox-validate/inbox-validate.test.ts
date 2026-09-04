import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { validateInbox } from "./inbox-validate";
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

describe("validateInbox", () => {
  it("flags local team labels and missing roster teams", async () => {
    const root = tempRoot("tf-inbox-validate");
    const tfDir = join(root, "inbox", "local", "pay-api", ".tokenforge");
    await mkdir(tfDir, { recursive: true });
    await writeFile(
      join(tfDir, "scan-report.json"),
      `${JSON.stringify(
        {
          team: "local",
          repo: "pay-api",
          provider: "cursor",
          timestamp: new Date().toISOString(),
          totals: { beforeTokens: 100, afterTokens: 50, savedTokens: 50 },
          findings: [],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const rosterPath = join(root, ROSTER_FILE);
    await writeFile(
      rosterPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          teams: [{ id: "payments" }, { id: "checkout" }],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await validateInbox({ root, roster: rosterPath, nowMs: Date.now() });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.kind === "local_or_empty_team")).toBe(true);
    expect(result.issues.some((i) => i.kind === "missing_team" && i.teamId === "payments")).toBe(
      true,
    );
  });
});
