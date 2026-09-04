import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
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
});
