import { describe, expect, it } from "vitest";
import {
  CURSOR_EPHEMERAL_DIR_NAMES,
  SKIP_DIR_NAMES,
  shouldSkipWalkDirectory,
} from "./paths";

describe("shouldSkipWalkDirectory", () => {
  it("still skips global deny-list directories", () => {
    for (const dir of SKIP_DIR_NAMES) {
      expect(shouldSkipWalkDirectory(dir, ".")).toBe(true);
    }
  });

  it("walks .cursor but skips ephemeral subtrees", () => {
    expect(shouldSkipWalkDirectory(".cursor", ".")).toBe(false);
    expect(shouldSkipWalkDirectory("rules", ".cursor")).toBe(false);
    for (const dir of CURSOR_EPHEMERAL_DIR_NAMES) {
      expect(shouldSkipWalkDirectory(dir, ".cursor")).toBe(true);
    }
  });

  it("does not skip unrelated directories under repo root", () => {
    expect(shouldSkipWalkDirectory("src", ".")).toBe(false);
    expect(shouldSkipWalkDirectory("config", "packages/a")).toBe(false);
  });
});
