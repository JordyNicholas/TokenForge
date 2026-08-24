import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { scanRepo } from "../commands/scan/scan";
import {
  borderlineAppExpectedTotalsPath,
  borderlineAppRoot,
  instructionsAppExpectedTotalsPath,
  instructionsAppRoot,
  leanAppExpectedTotalsPath,
  leanAppRoot,
  semanticDuplicatesAppExpectedTotalsPath,
  semanticDuplicatesAppRoot,
} from "../test/helpers";
import { savedPercent } from "./savings";

type Seed = {
  totals: { beforeTokens: number; afterTokens: number; savedTokens: number };
  savedPercent: number;
};

async function loadSeed(path: string): Promise<Seed> {
  return JSON.parse(await readFile(path, "utf8")) as Seed;
}

describe.each([
  ["lean-app", leanAppRoot, leanAppExpectedTotalsPath],
  ["borderline-app", borderlineAppRoot, borderlineAppExpectedTotalsPath],
  ["instructions-app", instructionsAppRoot, instructionsAppExpectedTotalsPath],
  [
    "semantic-duplicates-app",
    semanticDuplicatesAppRoot,
    semanticDuplicatesAppExpectedTotalsPath,
  ],
])("%s golden totals", (_name, root, expectedTotalsPath) => {
  it("matches fixtures/expected/*-totals.json (±0.1pp)", async () => {
    const seed = await loadSeed(expectedTotalsPath);
    const { report } = await scanRepo({ root });

    expect(report.totals).toEqual(seed.totals);
    expect(
      Math.abs(savedPercent(report.totals) - seed.savedPercent),
    ).toBeLessThanOrEqual(0.1);
  });
});
