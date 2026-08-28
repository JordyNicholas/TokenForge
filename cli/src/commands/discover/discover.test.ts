import { mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initRepo } from "../apply/apply";
import {
  activeSessionAppRoot,
  activeSessionLastScanPath,
  cleanupFixture,
  fixtureRoot,
} from "../../test/helpers";
import { runDiscover } from "./discover";

describe("discover", () => {
  afterEach(cleanupFixture);

  it("reports policy gaps before apply on noisy-app", async () => {
    const result = await runDiscover({ root: fixtureRoot, rescan: true });
    expect(result.appliedPatterns).toEqual([]);
    expect(result.opportunities.some((row) => row.category === "policy_gap")).toBe(
      true,
    );
    expect(result.missedTokens).toBeGreaterThan(0);
  });

  it("clears policy gaps after init apply", async () => {
    await initRepo({ root: fixtureRoot, provider: "copilot" });
    const result = await runDiscover({ root: fixtureRoot, rescan: true });
    expect(result.appliedPatterns.length).toBeGreaterThan(0);
    expect(result.opportunities.filter((row) => row.category === "policy_gap")).toEqual(
      [],
    );
  });

  it("surfaces session-kept paths from an active-session last-scan export", async () => {
    const result = await runDiscover({
      root: activeSessionAppRoot,
      reportPath: activeSessionLastScanPath,
      provider: "copilot",
    });
    expect(
      result.opportunities.some(
        (row) => row.category === "session_kept" && row.path.includes("locales"),
      ),
    ).toBe(true);
  });

  it("writes discover-latest.json for Prove handoff", async () => {
    const out = resolve(fixtureRoot, ".tokenforge/discover-latest.json");
    await rm(out, { force: true });
    await runDiscover({ root: fixtureRoot, rescan: true, writeReport: true });
    const saved = JSON.parse(await readFile(out, "utf8")) as {
      missedTokens: number;
      opportunities: unknown[];
    };
    expect(saved.missedTokens).toBeGreaterThan(0);
    expect(saved.opportunities.length).toBeGreaterThan(0);
  });
});
