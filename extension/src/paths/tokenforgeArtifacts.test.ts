import { describe, expect, it } from "vitest";
import { isTokenforgeArtifactPath } from "./tokenforgeArtifacts";

describe("isTokenforgeArtifactPath", () => {
  it("matches .tokenforge exports", () => {
    expect(isTokenforgeArtifactPath(".tokenforge/last-scan.json")).toBe(true);
    expect(isTokenforgeArtifactPath(".tokenforge\\session-stats.json")).toBe(true);
    expect(isTokenforgeArtifactPath(".tokenforge")).toBe(true);
  });

  it("leaves normal workspace paths alone", () => {
    expect(isTokenforgeArtifactPath("src/app.ts")).toBe(false);
    expect(isTokenforgeArtifactPath("docs/tokenforge.md")).toBe(false);
  });
});
