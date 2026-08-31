import { describe, expect, it } from "vitest";
import {
  isContextIndexPath,
  parseContextIndexRecommendations,
} from "./contextIndex";

describe("isContextIndexPath", () => {
  it("accepts markdown index paths", () => {
    expect(isContextIndexPath("docs/INDEX.md")).toBe(true);
    expect(isContextIndexPath(".cursor/rules/overview.mdc")).toBe(false);
    expect(isContextIndexPath("README.md")).toBe(true);
  });

  it("rejects source and config paths", () => {
    expect(isContextIndexPath("src/index.ts")).toBe(false);
    expect(isContextIndexPath("package.json")).toBe(false);
  });
});

describe("parseContextIndexRecommendations", () => {
  it("parses and bounds recommendations", () => {
    expect(
      parseContextIndexRecommendations([
        {
          path: "docs/architecture/INDEX.md",
          purpose: "Orient agents to service boundaries",
          summary: "Thin index linking to ADRs and package READMEs — no duplicated rules.",
        },
        {
          path: "src/main.ts",
          purpose: "bad",
          summary: "should drop",
        },
      ]),
    ).toEqual([
      {
        path: "docs/architecture/INDEX.md",
        purpose: "Orient agents to service boundaries",
        summary:
          "Thin index linking to ADRs and package READMEs — no duplicated rules.",
      },
    ]);
  });
});
