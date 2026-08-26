import { describe, expect, it } from "vitest";
import { activePathSet, isActivePath } from "./active";

describe("activePathSet", () => {
  it("is empty when the field is absent — absent means unknown, not none", () => {
    expect(activePathSet({}).size).toBe(0);
  });

  it("normalizes separators and a leading ./", () => {
    const active = activePathSet({
      activePaths: ["locales\\en.json", "./src/index.ts"],
    });

    expect(isActivePath(active, "locales/en.json")).toBe(true);
    expect(isActivePath(active, "src/index.ts")).toBe(true);
  });
});

describe("isActivePath", () => {
  const active = activePathSet({ activePaths: ["locales/en.json"] });

  it("matches an active path", () => {
    expect(isActivePath(active, "locales/en.json")).toBe(true);
  });

  it("does not match anything else", () => {
    expect(isActivePath(active, "package-lock.json")).toBe(false);
    // Prefix of an active path, not the path itself.
    expect(isActivePath(active, "locales")).toBe(false);
  });

  it("protects nothing when the set is empty", () => {
    expect(isActivePath(activePathSet({}), "locales/en.json")).toBe(false);
  });
});
