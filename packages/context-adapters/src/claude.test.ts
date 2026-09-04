import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { claudeContextAdapter } from "./claude.js";
import {
  SESSION_SHIELD_PATH,
  readSessionShield,
} from "./session-shield-file.js";

describe("claudeContextAdapter", () => {
  it("records advisory shields in session-shield.json without ignore files", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-claude-"));
    try {
      const result = await claudeContextAdapter.shield(
        root,
        "package-lock.json",
        "soft",
      );

      expect(result).toMatchObject({
        path: "package-lock.json",
        mode: "soft",
        effectiveness: "advisory",
        shielded: true,
        modifiedFiles: [SESSION_SHIELD_PATH],
      });

      const session = await readSessionShield(root);
      expect(session.entries[0]).toMatchObject({
        path: "package-lock.json",
        provider: "claude",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes session shield entries on unshield", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-claude-unshield-"));
    try {
      await claudeContextAdapter.shield(root, "vendor/**", "hard");
      const unshielded = await claudeContextAdapter.unshield(root, "vendor/**");

      expect(unshielded.shielded).toBe(false);
      expect((await readSessionShield(root)).entries).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
