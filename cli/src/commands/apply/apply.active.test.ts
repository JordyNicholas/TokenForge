import { afterEach, describe, expect, it } from "vitest";
import {
  CURSOR_IGNORE_CANDIDATES_PATH,
} from "../../adapters";
import {
  activeSessionAppRoot,
  activeSessionLastScanPath,
  cleanupFixtureAt,
} from "../../test/helpers";
import { scanRepo } from "../scan/scan";
import { applyPolicy } from "./apply";

afterEach(() => cleanupFixtureAt(activeSessionAppRoot));

const LOCALE = "locales/en.json";
const LOCKFILE = "package-lock.json";

function exclusionYaml(files: readonly { path: string; contents: string }[]): string {
  const file = files.find((entry) => entry.path.endsWith(".yml"));
  if (!file) {
    throw new Error("no exclusion YAML in the rendered pack");
  }
  return file.contents;
}

function ignoreCandidates(files: readonly { path: string; contents: string }[]): string {
  const file = files.find((entry) => entry.path === CURSOR_IGNORE_CANDIDATES_PATH);
  if (!file) {
    throw new Error("no cursor ignore candidates in the rendered pack");
  }
  return file.contents;
}

describe("active session paths (#137)", () => {
  describe("scan", () => {
    it("keeps an open path instead of proposing it for exclusion", async () => {
      const { report } = await scanRepo({
        root: activeSessionAppRoot,
        activePathsFile: activeSessionLastScanPath,
      });

      const locale = report.findings.find((finding) => finding.path === LOCALE);
      expect(locale).toMatchObject({ reason: "oversized", action: "kept" });
      // Downgraded, not dropped — the size risk is still reported.
      expect(locale?.detail).toMatch(/open in the editor/i);
    });

    it("stops counting the open path as saved, so Prove cannot overclaim", async () => {
      const baseline = await scanRepo({ root: activeSessionAppRoot });
      const withSession = await scanRepo({
        root: activeSessionAppRoot,
        activePathsFile: activeSessionLastScanPath,
      });

      expect(baseline.report.totals.savedTokens).toBeGreaterThan(
        withSession.report.totals.savedTokens,
      );
      // Exactly the locale file's tokens, nothing else moved.
      const locale = baseline.report.findings.find((f) => f.path === LOCALE);
      expect(
        baseline.report.totals.savedTokens - withSession.report.totals.savedTokens,
      ).toBe(locale?.estTokens);
    });

    it("still excludes real waste — the signal protects, it does not blunt", async () => {
      const { report } = await scanRepo({
        root: activeSessionAppRoot,
        activePathsFile: activeSessionLastScanPath,
      });

      expect(report.findings.find((finding) => finding.path === LOCKFILE)).toMatchObject(
        { action: "excluded" },
      );
    });

    it("records the session on the report so a later apply can honour it", async () => {
      const { report } = await scanRepo({
        root: activeSessionAppRoot,
        activePathsFile: activeSessionLastScanPath,
      });

      expect(report.activePaths).toContain(LOCALE);
    });
  });

  describe("apply", () => {
    it("never names an open path in the exclusion artifact", async () => {
      const { report } = await scanRepo({
        root: activeSessionAppRoot,
        activePathsFile: activeSessionLastScanPath,
      });
      const applied = await applyPolicy({
        root: activeSessionAppRoot,
        report,
        dryRun: true,
      });

      const yaml = exclusionYaml(applied.files);
      expect(yaml).not.toContain(LOCALE);
      expect(yaml).toContain(LOCKFILE);
    });

    it("holds even when the report says excluded — the guard is not scan-only", async () => {
      // A report from an older CLI, or hand-edited: action still `excluded`,
      // but activePaths names the path. The exclusion artifact must refuse it.
      const { report } = await scanRepo({ root: activeSessionAppRoot });
      expect(report.findings.find((f) => f.path === LOCALE)?.action).toBe("excluded");

      const applied = await applyPolicy({
        root: activeSessionAppRoot,
        report: { ...report, activePaths: [LOCALE] },
        dryRun: true,
      });

      expect(exclusionYaml(applied.files)).not.toContain(LOCALE);
    });

    it("merges the flag into a report that predates it", async () => {
      const { report } = await scanRepo({ root: activeSessionAppRoot });
      const applied = await applyPolicy({
        root: activeSessionAppRoot,
        report,
        activePathsFile: activeSessionLastScanPath,
        dryRun: true,
      });

      expect(applied.report.activePaths).toContain(LOCALE);
      expect(exclusionYaml(applied.files)).not.toContain(LOCALE);
    });

    it("is unchanged without the signal (no silent behaviour shift)", async () => {
      const { report } = await scanRepo({ root: activeSessionAppRoot });
      const applied = await applyPolicy({
        root: activeSessionAppRoot,
        report,
        dryRun: true,
      });

      const yaml = exclusionYaml(applied.files);
      expect(yaml).toContain(LOCALE);
      expect(yaml).toContain(LOCKFILE);
      expect(applied.report.activePaths).toBeUndefined();
    });

    it("never names an open path in cursor ignore candidates", async () => {
      const { report } = await scanRepo({
        root: activeSessionAppRoot,
        activePathsFile: activeSessionLastScanPath,
      });
      const applied = await applyPolicy({
        root: activeSessionAppRoot,
        report,
        provider: "cursor",
        dryRun: true,
      });

      const ignore = ignoreCandidates(applied.files);
      expect(ignore).not.toContain(LOCALE);
      expect(ignore).toContain(LOCKFILE);
    });
  });
});
