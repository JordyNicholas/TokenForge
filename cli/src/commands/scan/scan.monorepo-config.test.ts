import {
  repeatedConfigBasenames,
  selectEnrichmentCandidates,
} from "@tokenforge/risk-core";
import { buildMapPrompt } from "@tokenforge/enrichers";
import { afterEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanupFixtureAt, monorepoConfigAppRoot } from "../../test/helpers";
import { scanRepo } from "./scan";

afterEach(() => cleanupFixtureAt(monorepoConfigAppRoot));

describe("scanRepo (monorepo-config-app, #136 candidate routing)", () => {
  it("finds nothing heuristically — this waste has no size or filetype signal", async () => {
    const { report } = await scanRepo({ root: monorepoConfigAppRoot });

    expect(report.findings).toEqual([]);
    expect(report.totals.savedTokens).toBe(0);
  });

  it("routes every per-package tsconfig copy to the enricher", async () => {
    const { assessments } = await scanRepo({ root: monorepoConfigAppRoot });
    const paths = selectEnrichmentCandidates(assessments).map((item) => item.path);

    expect(paths).toContain("packages/a/tsconfig.json");
    expect(paths).toContain("packages/b/tsconfig.json");
    expect(paths).toContain("packages/c/tsconfig.json");
  });

  it("selects the copies despite each being far under MIN_BORDERLINE_BYTES", async () => {
    const { assessments } = await scanRepo({ root: monorepoConfigAppRoot });
    const copies = assessments.filter((item) =>
      item.path.endsWith("/tsconfig.json"),
    );

    expect(copies).toHaveLength(3);
    for (const copy of copies) {
      expect(copy.bytes).toBeLessThan(4_096);
      expect(copy.atRisk).toBe(false);
    }
  });

  it("still routes a protected config — #135 protection is about exclusion, not analysis", async () => {
    // tsconfig.json and package.json are both in PROTECTED_CONFIG_NAMES. That
    // suppresses exclusion-driving reasons; it must not make them invisible to
    // the hybrid pass, which is the only layer that can see this waste.
    const { assessments } = await scanRepo({ root: monorepoConfigAppRoot });
    const selected = selectEnrichmentCandidates(assessments);
    const tsconfigA = selected.find(
      (item) => item.path === "packages/a/tsconfig.json",
    );

    expect(tsconfigA?.protection).toBe("protected_config");
  });

  it("routes the package.json control too — routing is by name, judgement is the model's", async () => {
    const { assessments } = await scanRepo({ root: monorepoConfigAppRoot });
    const repeated = repeatedConfigBasenames(
      assessments.map((item) => item.path),
    );

    // Both basenames repeat. Only the tsconfig copies actually duplicate their
    // settings; the prompt rules are what keep the model off the package.json
    // pair, not the router.
    expect(repeated.has("tsconfig.json")).toBe(true);
    expect(repeated.has("package.json")).toBe(true);
  });

  it("gives each copy a content digest in the Pass A map", async () => {
    const { assessments } = await scanRepo({ root: monorepoConfigAppRoot });
    const selected = selectEnrichmentCandidates(assessments).filter((item) =>
      item.path.endsWith("/tsconfig.json"),
    );
    const candidates = await Promise.all(
      selected.map(async (item) => ({
        path: item.path,
        bytes: item.bytes,
        estTokens: item.estTokens,
        excerpt: await readFile(join(monorepoConfigAppRoot, item.path), "utf8"),
      })),
    );

    const prompt = buildMapPrompt(candidates);

    // Copy C expands `"strict": true` into its constituent flags, so the model
    // can only pair it with A and B by reasoning about what the settings do.
    // Without the digest it would see three paths and three byte counts.
    expect(prompt).toContain("strictNullChecks");
    expect(prompt).toContain('"strict": true');
    expect(prompt.match(/digest:/g)).toHaveLength(3);
  });
});
