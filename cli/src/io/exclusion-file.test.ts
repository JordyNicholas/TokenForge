import { describe, expect, it } from "vitest";
import { parseExclusionYaml } from "./exclusion-file";

describe("parseExclusionYaml", () => {
  it("reads path entries from a TokenForge exclusion sidecar", () => {
    const yaml = `# header
provider: copilot
repo: "demo"
paths:
  - package-lock.json
  - dist/**
`;
    expect(parseExclusionYaml(yaml)).toEqual(["package-lock.json", "dist/**"]);
  });

  it("returns an empty list for paths: []", () => {
    expect(parseExclusionYaml("paths:\n  []")).toEqual([]);
  });
});
