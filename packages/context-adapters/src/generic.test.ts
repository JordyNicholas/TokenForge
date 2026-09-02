import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { genericContextAdapter } from "./generic.js";
import {
  SESSION_SHIELD_PATH,
  readSessionShield,
} from "./session-shield-file.js";

describe("genericContextAdapter", () => {
  it("records advisory shields in session-shield.json without ignore files", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-generic-"));
    try {
      const result = await genericContextAdapter.shield(
        root,
        "./package-lock.json",
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
      expect(session.entries).toHaveLength(1);
      expect(session.entries[0]).toMatchObject({
        path: "package-lock.json",
        mode: "soft",
        provider: "generic",
      });

      const raw = await readFile(join(root, SESSION_SHIELD_PATH), "utf8");
      expect(raw).toContain('"version": 1');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes session shield entries on unshield", async () => {
    const root = await mkdtemp(join(tmpdir(), "tokenforge-generic-"));
    try {
      await genericContextAdapter.shield(root, "dist/**", "hard");
      const unshielded = await genericContextAdapter.unshield(root, "dist/**");

      expect(unshielded.shielded).toBe(false);
      const session = await readSessionShield(root);
      expect(session.entries).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
