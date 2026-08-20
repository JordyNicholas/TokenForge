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

/** Negative control: a healthy repo with nothing to flag. */
export const leanAppRoot = resolve(repoRoot, "fixtures/lean-app");
export const leanAppExpectedTotalsPath = resolve(
  repoRoot,
  "fixtures/expected/lean-app-totals.json",
);

/** Precision stress test: legitimate large files heuristics still flag. */
export const borderlineAppRoot = resolve(repoRoot, "fixtures/borderline-app");
export const borderlineAppExpectedTotalsPath = resolve(
  repoRoot,
  "fixtures/expected/borderline-app-totals.json",
);

/** Hybrid/LLM candidate-selection fixture: verbose agent instruction files. */
export const instructionsAppRoot = resolve(repoRoot, "fixtures/instructions-app");
export const instructionsAppExpectedTotalsPath = resolve(
  repoRoot,
  "fixtures/expected/instructions-app-totals.json",
);

export async function cleanupFixture(): Promise<void> {
  await rm(resolve(fixtureRoot, ".tokenforge"), { recursive: true, force: true });
  await rm(resolve(fixtureRoot, ".github"), { recursive: true, force: true });
}

/**
 * Same as {@link cleanupFixture} for an arbitrary fixture root. Always call via
 * a wrapper (e.g. `afterEach(() => cleanupFixtureAt(leanAppRoot))`), never bare
 * — vitest calls afterEach hooks with a TestContext argument, which would land
 * in `root` if this were passed directly.
 */
export async function cleanupFixtureAt(root: string): Promise<void> {
  await rm(resolve(root, ".tokenforge"), { recursive: true, force: true });
  await rm(resolve(root, ".github"), { recursive: true, force: true });
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
