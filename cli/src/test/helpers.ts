import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Monorepo root (TokenForge/). */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const fixtureRoot = resolve(repoRoot, "fixtures/noisy-app");

export const expectedTotalsPath = resolve(
  repoRoot,
  "fixtures/expected/noisy-app-totals.json",
);

export async function cleanupFixture(): Promise<void> {
  await rm(resolve(fixtureRoot, ".tokenforge"), { recursive: true, force: true });
  await rm(resolve(fixtureRoot, ".github"), { recursive: true, force: true });
}

export function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write(chunk: string) { stdout += chunk; } },
      stderr: { write(chunk: string) { stderr += chunk; } },
    },
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    },
  };
}
