import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TrackedTab } from "../tabs/types";
import { collectInstructionCandidates } from "./collectCandidates";

describe("collectInstructionCandidates", () => {
  it("selects workspace instruction files even when not open as tabs", async () => {
    const root = await mkdtemp(join(tmpdir(), "tf-enrich-"));
    await writeFile(join(root, "AGENTS.md"), "# agents\n".repeat(200), "utf8");
    await writeFile(join(root, "README.md"), "# readme\n", "utf8");

    const selected = await collectInstructionCandidates(root, []);
    expect(selected.map((item) => item.path)).toEqual(["AGENTS.md"]);
  });

  it("includes walked instruction files and ignores non-instruction tabs", async () => {
    const root = await mkdtemp(join(tmpdir(), "tf-enrich-tabs-"));
    await writeFile(join(root, "CLAUDE.md"), "# claude\n".repeat(100), "utf8");

    const now = Date.now();
    const tabs: TrackedTab[] = [
      {
        uri: "file:///lock",
        path: "package-lock.json",
        bytes: 4000,
        lastActivityAt: now,
        lastFocusAt: now,
        lastEditAt: now,
        assessment: {
          path: "package-lock.json",
          bytes: 4000,
          estTokens: 1000,
          fileClass: "lockfile",
          score: 90,
          atRisk: true,
          reasons: ["high_risk_filetype"],
        },
      },
    ];

    const selected = await collectInstructionCandidates(root, tabs);
    expect(selected.map((item) => item.path)).toContain("CLAUDE.md");
    expect(selected.map((item) => item.path)).not.toContain("package-lock.json");
  });
});
