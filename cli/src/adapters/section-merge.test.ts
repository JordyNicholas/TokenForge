import { describe, expect, it } from "vitest";
import {
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
  mergeTokenForgeSection,
  wrapTokenForgeSection,
} from "./section-merge";

describe("mergeTokenForgeSection", () => {
  const body = "# TokenForge instructions\n\n- `lock.json`\n";

  it("creates a marked file when nothing exists", () => {
    const result = mergeTokenForgeSection(null, body);
    expect(result.disposition).toBe("create");
    expect(result.contents).toContain(TOKENFORGE_SECTION_BEGIN);
    expect(result.contents).toContain(TOKENFORGE_SECTION_END);
    expect(result.contents).toContain("# TokenForge instructions");
  });

  it("appends a marked section when the file has no markers", () => {
    const prior = "# Team rules\n\nAlways use TypeScript.\n";
    const result = mergeTokenForgeSection(prior, body);
    expect(result.disposition).toBe("merge");
    expect(result.contents.startsWith("# Team rules")).toBe(true);
    expect(result.contents).toContain("Always use TypeScript.");
    expect(result.contents).toContain(TOKENFORGE_SECTION_BEGIN);
    expect(result.contents.indexOf("Always use TypeScript.")).toBeLessThan(
      result.contents.indexOf(TOKENFORGE_SECTION_BEGIN),
    );
  });

  it("replaces an existing marked section and keeps surrounding text", () => {
    const prior = [
      "# Team rules",
      "",
      "Keep me.",
      "",
      wrapTokenForgeSection("# old TokenForge\n"),
      "",
      "## After",
      "Also keep me.",
      "",
    ].join("\n");
    const result = mergeTokenForgeSection(prior, "# new TokenForge\n\n- a\n");
    expect(result.disposition).toBe("merge");
    expect(result.contents).toContain("Keep me.");
    expect(result.contents).toContain("Also keep me.");
    expect(result.contents).toContain("# new TokenForge");
    expect(result.contents).not.toContain("# old TokenForge");
  });
});
