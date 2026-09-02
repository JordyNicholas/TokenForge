import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  TOKENFORGE_IGNORE_BEGIN,
  TOKENFORGE_IGNORE_END,
} from "./ignore-merge.js";
import { cursorContextAdapter } from "./cursor.js";
import {
  SESSION_SHIELD_PATH,
  readSessionShield,
} from "./session-shield-file.js";

describe("cursorContextAdapter", () => {
  it("merges soft shields into .cursorindexingignore", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-cursor-soft-"));
    try {
      await writeFile(join(root, ".cursorindexingignore"), "legacy/\n", "utf8");

      const result = await cursorContextAdapter.shield(
        root,
        "package-lock.json",
        "soft",
      );

      expect(result.modifiedFiles).toContain(".cursorindexingignore");
      const ignore = await readFile(join(root, ".cursorindexingignore"), "utf8");
      expect(ignore).toContain("legacy/");
      expect(ignore).toContain(TOKENFORGE_IGNORE_BEGIN);
      expect(ignore).toContain("package-lock.json");
      expect(ignore).toContain(TOKENFORGE_IGNORE_END);

      const session = await readSessionShield(root);
      expect(session.entries[0]).toMatchObject({
        path: "package-lock.json",
        mode: "soft",
        provider: "cursor",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("merges hard shields into .cursorignore at repo root", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-cursor-hard-"));
    try {
      const result = await cursorContextAdapter.shield(root, "dist/**", "hard");

      expect(result).toMatchObject({
        mode: "hard",
        effectiveness: "full",
        shielded: true,
      });
      expect(result.modifiedFiles).toContain(".cursorignore");

      const ignore = await readFile(join(root, ".cursorignore"), "utf8");
      expect(ignore).toContain("dist/**");
      expect(ignore).toContain(TOKENFORGE_IGNORE_BEGIN);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes patterns from both ignore files and session-shield.json on unshield", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-cursor-unshield-"));
    try {
      await cursorContextAdapter.shield(root, "secrets.env", "soft");
      await cursorContextAdapter.shield(root, "secrets.env", "hard");

      const unshielded = await cursorContextAdapter.unshield(root, "secrets.env");

      expect(unshielded.shielded).toBe(false);
      expect(unshielded.modifiedFiles).toContain(SESSION_SHIELD_PATH);

      const softIgnore = await readFile(
        join(root, ".cursorindexingignore"),
        "utf8",
      );
      const hardIgnore = await readFile(join(root, ".cursorignore"), "utf8");
      expect(softIgnore).not.toContain("secrets.env");
      expect(hardIgnore).not.toContain("secrets.env");

      const session = await readSessionShield(root);
      expect(session.entries).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
