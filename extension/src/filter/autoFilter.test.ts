import { describe, expect, it } from "vitest";
import { TabRegistry } from "../tabs/registry";
import { RiskSession } from "../session/riskSession";
import { applyAutoFilter, isAutoFilterCandidate } from "./autoFilter";

describe("isAutoFilterCandidate", () => {
  it("matches lockfile and generated classes only", () => {
    expect(
      isAutoFilterCandidate({
        path: "package-lock.json",
        bytes: 100,
        estTokens: 25,
        fileClass: "lockfile",
        score: 90,
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
    ).toBe(true);
    expect(
      isAutoFilterCandidate({
        path: "dist/a.js",
        bytes: 100,
        estTokens: 25,
        fileClass: "generated",
        score: 80,
        atRisk: true,
        reasons: ["high_risk_filetype"],
      }),
    ).toBe(true);
    expect(
      isAutoFilterCandidate({
        path: "src/a.ts",
        bytes: 100,
        estTokens: 25,
        fileClass: "source",
        score: 10,
        atRisk: false,
        reasons: [],
      }),
    ).toBe(false);
  });
});

describe("applyAutoFilter", () => {
  it("filters pending high-risk tabs only when enabled", () => {
    const registry = new TabRegistry();
    const session = new RiskSession(registry);
    const now = Date.now();
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      now,
    );
    registry.upsert(
      "file:///src",
      { path: "src/a.ts", bytes: 100, focus: true },
      now,
    );

    expect(applyAutoFilter(session, false)).toBe(0);
    expect(session.decision("file:///lock")).toBe("pending");

    expect(applyAutoFilter(session, true)).toBe(1);
    expect(session.decision("file:///lock")).toBe("filtered");
    expect(session.decision("file:///src")).toBe("pending");

    session.keep("file:///lock");
    expect(applyAutoFilter(session, true)).toBe(0);
    expect(session.decision("file:///lock")).toBe("kept");
  });
});
