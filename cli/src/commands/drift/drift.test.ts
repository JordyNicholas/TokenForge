import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { applySectionHashPath } from "../../io/paths";
import { checkPolicyDrift } from "./drift";

describe("checkPolicyDrift", () => {
  it("reports missing file", async () => {
    const root = join(tmpdir(), `tf-drift-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const result = await checkPolicyDrift({ root, provider: "generic" });
    expect(result.status).toBe("missing_file");
  });

  it("reports ok when managed section exists", async () => {
    const root = join(tmpdir(), `tf-drift-ok-${Date.now()}`);
    const dir = join(root, ".github");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "tokenforge-instructions.md"),
      "<!-- tokenforge:begin -->\n# Pack\n\nDo not load lockfiles.\n<!-- tokenforge:end -->\n",
      "utf8",
    );
    const result = await checkPolicyDrift({ root, provider: "generic" });
    expect(result.status).toBe("ok");
  });

  it("reports hash_mismatch when body differs from last-apply artifact", async () => {
    const root = join(tmpdir(), `tf-drift-hash-${Date.now()}`);
    const dir = join(root, ".github");
    await mkdir(join(root, ".tokenforge"), { recursive: true });
    await mkdir(dir, { recursive: true });
    const instructionPath = ".github/tokenforge-instructions.md";
    const body = "# Pack\n\nDo not load lockfiles.";
    await writeFile(
      join(root, instructionPath),
      `<!-- tokenforge:begin -->\n${body}\n<!-- tokenforge:end -->\n`,
      "utf8",
    );
    const staleHash = createHash("sha256").update("stale body").digest("hex");
    await writeFile(
      applySectionHashPath(root),
      `${JSON.stringify(
        {
          provider: "generic",
          instructionPath,
          sha256: staleHash,
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await checkPolicyDrift({ root, provider: "generic" });
    expect(result.status).toBe("hash_mismatch");
    expect(result.expectedHash).toBe(staleHash);
    expect(result.actualHash).toBe(createHash("sha256").update(body).digest("hex"));
  });

  it("reports ok when body hash matches last-apply artifact", async () => {
    const root = join(tmpdir(), `tf-drift-hash-ok-${Date.now()}`);
    const dir = join(root, ".github");
    await mkdir(join(root, ".tokenforge"), { recursive: true });
    await mkdir(dir, { recursive: true });
    const instructionPath = ".github/tokenforge-instructions.md";
    const body = "# Pack\n\nStill aligned.";
    const hash = createHash("sha256").update(body).digest("hex");
    await writeFile(
      join(root, instructionPath),
      `<!-- tokenforge:begin -->\n${body}\n<!-- tokenforge:end -->\n`,
      "utf8",
    );
    await writeFile(
      applySectionHashPath(root),
      `${JSON.stringify(
        {
          provider: "generic",
          instructionPath,
          sha256: hash,
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await checkPolicyDrift({ root, provider: "generic" });
    expect(result.status).toBe("ok");
  });
});
