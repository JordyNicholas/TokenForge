import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { stageDashboard } from "./stage-dashboard";

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

describe("stageDashboard", () => {
  it("stages org-prove-pack and returns pack boot URL", async () => {
    const root = tempRoot("tf-stage-dashboard");
    await mkdir(root, { recursive: true });
    const publicDir = join(root, "public");
    const packPath = join(root, "org-prove-pack.json");
    await writeFile(
      packPath,
      `${JSON.stringify({ schemaVersion: 1, businessUnit: "BU", seed: { businessUnit: "BU", reports: [] } }, null, 2)}\n`,
      "utf8",
    );

    const result = await stageDashboard({ path: packPath, publicDir });
    expect(result.copied).toContain("org-prove-pack.json");
    expect(result.bootUrl).toContain("pack=/org-prove-pack.json");
  });

  it("stages last-scan from repo .tokenforge directory", async () => {
    const root = tempRoot("tf-stage-repo");
    const publicDir = join(root, "public");
    const tf = join(root, ".tokenforge");
    await mkdir(tf, { recursive: true });
    await writeFile(join(tf, "scan-report.json"), '{"team":"t","repo":"r"}\n', "utf8");

    const result = await stageDashboard({ path: root, publicDir });
    expect(result.copied).toContain("last-scan.json");
    expect(result.bootUrl).toContain("last-scan.json");
  });
});
