import { describe, expect, it, vi } from "vitest";
import { TabRegistry } from "../tabs/registry";
import {
  applyAutoShield,
  isAutoFilterCandidate,
  type AutoShieldSession,
} from "./autoFilter";
import type { TabDecision } from "./types";

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

/** Fake session that records Shield calls and flips the decision like the real one. */
function fakeSession(registry: TabRegistry): {
  session: AutoShieldSession;
  shield: ReturnType<typeof vi.fn>;
  setDecision: (uri: string, decision: TabDecision) => void;
} {
  const decisions = new Map<string, TabDecision>();
  const shield = vi.fn(async (uri: string) => {
    decisions.set(uri, "filtered");
    return undefined;
  });
  return {
    shield,
    setDecision: (uri, decision) => decisions.set(uri, decision),
    session: {
      listAll: () => registry.list(),
      decision: (uri) => decisions.get(uri) ?? "pending",
      shield,
    },
  };
}

describe("applyAutoShield", () => {
  it("shields pending high-risk tabs with real levers only when enabled", async () => {
    const registry = new TabRegistry();
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

    const { session, shield } = fakeSession(registry);

    // Disabled → no Shield levers applied.
    expect(await applyAutoShield(session, false)).toBe(0);
    expect(shield).not.toHaveBeenCalled();

    // Enabled → the lockfile is Shielded (real lever), source is left alone.
    expect(await applyAutoShield(session, true)).toBe(1);
    expect(shield).toHaveBeenCalledWith("file:///lock", { mode: "hard" });
    expect(shield).toHaveBeenCalledTimes(1);
    expect(session.decision("file:///lock")).toBe("filtered");
    expect(session.decision("file:///src")).toBe("pending");

    // Idempotent — an already-Shielded tab is not re-applied.
    expect(await applyAutoShield(session, true)).toBe(0);
    expect(shield).toHaveBeenCalledTimes(1);
  });

  it("leaves Allowed tabs untouched so Allow stays a durable override", async () => {
    const registry = new TabRegistry();
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 4_000, focus: true },
      Date.now(),
    );
    const { session, shield, setDecision } = fakeSession(registry);
    setDecision("file:///lock", "kept");

    expect(await applyAutoShield(session, true)).toBe(0);
    expect(shield).not.toHaveBeenCalled();
    expect(session.decision("file:///lock")).toBe("kept");
  });
});
