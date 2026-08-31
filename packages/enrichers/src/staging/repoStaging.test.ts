import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  CODEX_AUDIT_HARD_SKIP_DIRS,
  stageRepositoryForAudit,
} from "./repoStaging";

describe("stageRepositoryForAudit", () => {
  it("copies eligible files and skips hard dirs and secrets", async () => {
    const source = await mkdtemp(join(tmpdir(), "tokenforge-stage-src-"));
    const dest = await mkdtemp(join(tmpdir(), "tokenforge-stage-dest-"));
    try {
      await writeFile(join(source, "README.md"), "# Hello", "utf8");
      await mkdir(join(source, "node_modules", "pkg"), { recursive: true });
      await writeFile(join(source, "node_modules", "pkg", "index.js"), "x", "utf8");
      await mkdir(join(source, ".git"), { recursive: true });
      await writeFile(join(source, ".git", "HEAD"), "ref", "utf8");
      await mkdir(join(source, "config"), { recursive: true });
      await writeFile(
        join(source, "config", "service-account.json"),
        '{"private_key":"x"}',
        "utf8",
      );

      const result = await stageRepositoryForAudit(source, dest);

      expect(CODEX_AUDIT_HARD_SKIP_DIRS.has("node_modules")).toBe(true);
      expect(result.stagedPaths.has("README.md")).toBe(true);
      expect(result.stagedPaths.has("node_modules/pkg/index.js")).toBe(false);
      expect(result.stagedPaths.has("config/service-account.json")).toBe(false);
      expect(result.coverage.filesCopied).toBe(1);
      expect(result.coverage.filesSkippedSecret).toBeGreaterThanOrEqual(1);
      expect(await readFile(join(dest, "README.md"), "utf8")).toBe("# Hello");
    } finally {
      await rm(source, { recursive: true, force: true });
      await rm(dest, { recursive: true, force: true });
    }
  });
});
