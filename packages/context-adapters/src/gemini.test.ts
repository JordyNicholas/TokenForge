import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TOKENFORGE_IGNORE_BEGIN } from "./ignore-merge.js";
import { geminiContextAdapter } from "./gemini.js";
import {
  SESSION_SHIELD_PATH,
  readSessionShield,
} from "./session-shield-file.js";

describe("geminiContextAdapter", () => {
  it("merges shields into .geminiignore with partial effectiveness", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-gemini-"));
    try {
      const result = await geminiContextAdapter.shield(
        root,
        "./package-lock.json",
        "soft",
      );

      expect(result).toMatchObject({
        path: "package-lock.json",
        mode: "soft",
        effectiveness: "partial",
        shielded: true,
        modifiedFiles: [".geminiignore", SESSION_SHIELD_PATH],
      });

      const ignore = await readFile(join(root, ".geminiignore"), "utf8");
      expect(ignore).toContain(TOKENFORGE_IGNORE_BEGIN);
      expect(ignore).toContain("package-lock.json");

      const session = await readSessionShield(root);
      expect(session.entries[0]).toMatchObject({
        path: "package-lock.json",
        provider: "gemini",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes patterns from .geminiignore on unshield", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-gemini-unshield-"));
    try {
      await geminiContextAdapter.shield(root, "dist/**", "hard");
      const unshielded = await geminiContextAdapter.unshield(root, "dist/**");

      expect(unshielded.shielded).toBe(false);
      const ignore = await readFile(join(root, ".geminiignore"), "utf8");
      expect(ignore).not.toContain("dist/**");
      expect((await readSessionShield(root)).entries).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
