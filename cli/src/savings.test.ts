import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./cli";
import { savedPercent, savingsExitCode } from "./savings";

describe("savedPercent", () => {
  it("rounds to one decimal place", () => {
    expect(
      savedPercent({ beforeTokens: 455959, afterTokens: 733, savedTokens: 455226 }),
    ).toBe(99.8);
    expect(savedPercent({ beforeTokens: 0, afterTokens: 0, savedTokens: 0 })).toBe(0);
  });
});

describe("savingsExitCode", () => {
  it("is 0 when there are savings and 3 when there are none", () => {
    expect(
      savingsExitCode({ beforeTokens: 10, afterTokens: 1, savedTokens: 9 }),
    ).toBe(0);
    expect(
      savingsExitCode({ beforeTokens: 10, afterTokens: 10, savedTokens: 0 }),
    ).toBe(3);
  });
});

describe("runCli exit codes", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("exits 3 when a keep-only tree has no savings", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tokenforge-keep-"));
    dirs.push(dir);
    await writeFile(join(dir, "index.ts"), "export {}\n");

    let stdout = "";
    let stderr = "";
    const code = await runCli(["scan", dir], {
      stdout: { write(chunk: string) { stdout += chunk; } },
      stderr: { write(chunk: string) { stderr += chunk; } },
    });

    expect(code).toBe(3);
    expect(stdout).toContain("savedPercent  0.0%");
    expect(stderr).toBe("");
  });
});
