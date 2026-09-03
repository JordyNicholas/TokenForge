import { describe, expect, it } from "vitest";
import type { TokenRiskFinding } from "../domain/types";
import { dominantWasteKinds, joinLabels, wasteKindFor } from "./kinds";

function finding(
  path: string,
  estTokens: number,
  action: TokenRiskFinding["action"] = "excluded",
): TokenRiskFinding {
  return { path, reason: "oversized", bytes: estTokens * 4, estTokens, action };
}

describe("wasteKindFor", () => {
  it("buckets binaries by extension", () => {
    expect(wasteKindFor("shared/static/emails/order.jpg")).toBe("binary");
    expect(wasteKindFor("core/fonts/Geist.ttf")).toBe("binary");
    expect(wasteKindFor("core/img/flags/sa.svg")).toBe("binary");
  });

  it("buckets lockfiles and structured data as dumps", () => {
    expect(wasteKindFor("pnpm-lock.yaml")).toBe("dump");
    expect(wasteKindFor("shared/data/icons.json")).toBe("dump");
    expect(wasteKindFor("run2-complex.jsonl")).toBe("dump");
  });

  it("buckets build and CI output", () => {
    expect(wasteKindFor("dist/bundle.js")).toBe("output");
    expect(wasteKindFor("coverage/lcov.info")).toBe("output");
    expect(wasteKindFor("test-results/junit.xml")).toBe("output");
  });

  it("treats large markdown as prose, not a dump", () => {
    expect(wasteKindFor("docs/content/customization.mdx")).toBe("prose");
  });
});

describe("dominantWasteKinds", () => {
  it("ranks by est. tokens, heaviest first", () => {
    const kinds = dominantWasteKinds([
      finding("a.jpg", 500),
      finding("b.jpg", 500),
      finding("data.json", 900),
      finding("notes.md", 10),
    ]);
    expect(kinds).toEqual(["binary", "dump"]);
  });

  it("ignores rows the pack keeps", () => {
    expect(dominantWasteKinds([finding("a.jpg", 500, "kept")])).toEqual([]);
  });
});

describe("joinLabels", () => {
  it("renders English lists", () => {
    expect(joinLabels(["a"])).toBe("a");
    expect(joinLabels(["a", "b"])).toBe("a and b");
    expect(joinLabels(["a", "b", "c"])).toBe("a, b, and c");
  });
});
