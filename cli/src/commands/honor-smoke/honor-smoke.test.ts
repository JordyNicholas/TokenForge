import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fixtureRoot } from "../../test/helpers";
import { buildHonorSmokeArtifact, writeHonorSmoke } from "./honor-smoke";

describe("honor-smoke", () => {
  afterEach(async () => {
    await rm(join(fixtureRoot, ".tokenforge", "honor-smoke.json"), {
      force: true,
    });
  });

  it("builds Cursor soft and hard modes with honesty", () => {
    const artifact = buildHonorSmokeArtifact("2026-09-01T00:00:00.000Z");
    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.provider).toBe("cursor");
    expect(artifact.modes).toHaveLength(2);
    expect(artifact.modes[0]?.ignoreFile).toBe(".cursorindexingignore");
    expect(artifact.modes[1]?.ignoreFile).toBe(".cursorignore");
    expect(artifact.honestyNote).toMatch(/not metering/i);
  });

  it("writes honor-smoke.json under .tokenforge", async () => {
    const result = await writeHonorSmoke({ root: fixtureRoot });
    expect(result.outPath).toMatch(/honor-smoke\.json$/);
    const raw = await readFile(result.outPath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.modes[1].steps.length).toBeGreaterThan(0);
  });
});
