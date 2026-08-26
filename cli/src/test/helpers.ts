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

/**
 * Semantic redundancy stress test: paraphrased (never verbatim) instruction
 * files plus source files that re-implement the same behavior differently.
 */
export const semanticDuplicatesAppRoot = resolve(repoRoot, "fixtures/semantic-duplicates-app");
export const semanticDuplicatesAppExpectedTotalsPath = resolve(
  repoRoot,
  "fixtures/expected/semantic-duplicates-app-totals.json",
);

/**
 * Edge-case fixture for #135: protected configs / API contracts / necessary
 * generated trees that must NOT be flagged, auxiliary bulk data that must be,
 * and two fake-credential files that must never reach an enricher.
 */
export const heuristicEdgeAppRoot = resolve(repoRoot, "fixtures/heuristic-edge-app");
export const heuristicEdgeAppExpectedTotalsPath = resolve(
  repoRoot,
  "fixtures/expected/heuristic-edge-app-totals.json",
);

/**
 * Candidate-routing fixture for #136: three near-identical per-package
 * tsconfig.json copies the heuristic layer cannot see, plus a package.json
 * control whose basename repeats without the settings repeating.
 */
export const monorepoConfigAppRoot = resolve(repoRoot, "fixtures/monorepo-config-app");
export const monorepoConfigAppExpectedTotalsPath = resolve(
  repoRoot,
  "fixtures/expected/monorepo-config-app-totals.json",
);

export async function cleanupFixture(): Promise<void> {
  await rm(resolve(fixtureRoot, ".tokenforge"), { recursive: true, force: true });
  await rm(resolve(fixtureRoot, ".github"), { recursive: true, force: true });
  await rm(resolve(fixtureRoot, ".claude"), { recursive: true, force: true });
  await rm(resolve(fixtureRoot, "CLAUDE.md"), { force: true });
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
  await rm(resolve(root, ".claude"), { recursive: true, force: true });
  await rm(resolve(root, "CLAUDE.md"), { force: true });
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
