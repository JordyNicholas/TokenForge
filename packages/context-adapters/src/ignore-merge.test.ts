import { describe, expect, it } from "vitest";
import {
  TOKENFORGE_IGNORE_BEGIN,
  TOKENFORGE_IGNORE_END,
  mergeIgnoreSection,
  removePathFromIgnoreSection,
} from "./ignore-merge.js";

describe("mergeIgnoreSection", () => {
  it("creates a managed section in an empty file", () => {
    const result = mergeIgnoreSection("", ["dist/**", "package-lock.json"]);
    expect(result).toContain(TOKENFORGE_IGNORE_BEGIN);
    expect(result).toContain(TOKENFORGE_IGNORE_END);
    expect(result).toContain("dist/**");
    expect(result).toContain("package-lock.json");
  });

  it("appends a managed section after existing content", () => {
    const existing = "node_modules/\n";
    const result = mergeIgnoreSection(existing, ["dist/**"]);
    expect(result.startsWith("node_modules/\n\n")).toBe(true);
    expect(result).toContain(TOKENFORGE_IGNORE_BEGIN);
    expect(result).toContain("dist/**");
  });

  it("merges patterns into an existing managed section without duplicates", () => {
    const existing = [
      "legacy/",
      TOKENFORGE_IGNORE_BEGIN,
      "package-lock.json",
      TOKENFORGE_IGNORE_END,
      "",
    ].join("\n");

    const result = mergeIgnoreSection(existing, ["dist/**", "package-lock.json"]);

    expect(result).toContain("legacy/");
    expect(result).toContain("dist/**");
    expect(result).toContain("package-lock.json");
    expect(result.match(/package-lock\.json/g)).toHaveLength(1);
  });

  it("normalizes path separators and leading ./", () => {
    const result = mergeIgnoreSection("", [".\\dist\\**", "./secrets.env"]);
    expect(result).toContain("dist/**");
    expect(result).toContain("secrets.env");
  });
});

describe("removePathFromIgnoreSection", () => {
  it("removes one pattern and keeps the managed section", () => {
    const existing = mergeIgnoreSection("", ["dist/**", "package-lock.json"]);
    const result = removePathFromIgnoreSection(existing, "dist/**");

    expect(result).not.toContain("dist/**");
    expect(result).toContain("package-lock.json");
    expect(result).toContain(TOKENFORGE_IGNORE_BEGIN);
  });

  it("drops the managed section when the last pattern is removed", () => {
    const existing = mergeIgnoreSection("legacy/\n", ["dist/**"]);
    const result = removePathFromIgnoreSection(existing, "dist/**");

    expect(result).not.toContain(TOKENFORGE_IGNORE_BEGIN);
    expect(result).toBe("legacy/\n");
  });

  it("returns the original content when no managed section exists", () => {
    const existing = "node_modules/\n";
    expect(removePathFromIgnoreSection(existing, "dist/**")).toBe(existing);
  });
});
