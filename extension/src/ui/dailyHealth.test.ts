import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  CURSOR_IGNORE_CANDIDATES_PATH,
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
} from "@tokenforge/policy-adapters";
import { buildDailyHealth } from "./dailyHealth";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function tempRoot(prefix: string): string {
  const root = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  roots.push(root);
  return root;
}

describe("buildDailyHealth", () => {
  it("reports missing scan and unsent session by default", async () => {
    const root = tempRoot("tf-health-empty");
    const health = await buildDailyHealth(root, "cursor");

    expect(health.scan.status).toBe("missing");
    expect(health.session.status).toBe("unsent");
    expect(health.drift.status).toBe("unknown");
  });

  it("marks scan ok when last-scan is recent", async () => {
    const root = tempRoot("tf-health-scan");
    const tf = join(root, ".tokenforge");
    await mkdir(tf, { recursive: true });
    await writeFile(join(tf, "last-scan.json"), "{}", "utf8");

    const health = await buildDailyHealth(root, "generic", Date.now());
    expect(health.scan.status).toBe("ok");
  });

  it("flags promote pending when cursor candidates exist without ignore section", async () => {
    const root = tempRoot("tf-health-promote");
    await mkdir(join(root, ".cursor"), { recursive: true });
    await writeFile(
      join(root, CURSOR_IGNORE_CANDIDATES_PATH),
      "package-lock.json\n",
      "utf8",
    );

    const health = await buildDailyHealth(root, "cursor");
    expect(health.promote.status).toBe("pending");
  });

  it("marks drift dirty when managed section is missing", async () => {
    const root = tempRoot("tf-health-drift");
    await mkdir(join(root, ".github"), { recursive: true });
    await writeFile(join(root, ".github/copilot-instructions.md"), "# user rules\n", "utf8");

    const health = await buildDailyHealth(root, "copilot");
    expect(health.drift.status).toBe("dirty");
  });

  it("marks drift ok when managed section matches hash artifact", async () => {
    const root = tempRoot("tf-health-drift-ok");
    const body = "Keep lockfiles out of agent context.";
    const managed = `${TOKENFORGE_SECTION_BEGIN}\n${body}\n${TOKENFORGE_SECTION_END}\n`;
    await mkdir(join(root, ".github"), { recursive: true });
    await writeFile(join(root, ".github/copilot-instructions.md"), managed, "utf8");
    await mkdir(join(root, ".tokenforge"), { recursive: true });
    const { createHash } = await import("node:crypto");
    const sha256 = createHash("sha256").update(body.trim()).digest("hex");
    await writeFile(
      join(root, ".tokenforge/apply-section-hash.json"),
      JSON.stringify({
        provider: "copilot",
        instructionPath: ".github/copilot-instructions.md",
        sha256,
      }),
      "utf8",
    );

    const health = await buildDailyHealth(root, "copilot");
    expect(health.drift.status).toBe("ok");
  });
});
