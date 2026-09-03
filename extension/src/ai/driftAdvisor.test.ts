import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: () => undefined }) },
}));

import type { ShieldSession } from "../session/shieldSession";
import type { TrackedTab } from "../tabs/types";
import { adviseContextDrift } from "./driftAdvisor";

function tab(
  path: string,
  extras: Partial<TrackedTab> & { fileClass?: TrackedTab["assessment"]["fileClass"]; reasons?: TrackedTab["assessment"]["reasons"]; estTokens?: number } = {},
): TrackedTab {
  const uri = extras.uri ?? `file:///${path}`;
  return {
    uri,
    path,
    bytes: 4_000,
    lastActivityAt: Date.now(),
    lastFocusAt: Date.now(),
    lastEditAt: Date.now(),
    assessment: {
      path,
      bytes: 4_000,
      estTokens: extras.estTokens ?? 1_000,
      fileClass: extras.fileClass ?? "source",
      score: 1,
      atRisk: true,
      reasons: extras.reasons ?? [],
    },
  };
}

describe("adviseContextDrift", () => {
  it("stays quiet when nothing is pending", () => {
    const session = {
      listPendingAtRisk: () => [],
      registry: { getActiveUri: () => undefined },
    } as unknown as ShieldSession;
    expect(adviseContextDrift(session)).toBeUndefined();
  });

  it("flags a stale focused file and lockfiles", () => {
    const focused = tab("src/app.ts", {
      reasons: ["inactive_tab"],
      estTokens: 400,
    });
    const lock = tab("package-lock.json", {
      fileClass: "lockfile",
      estTokens: 8_000,
    });
    const session = {
      listPendingAtRisk: () => [focused, lock],
      registry: { getActiveUri: () => focused.uri },
    } as unknown as ShieldSession;
    const advice = adviseContextDrift(session);
    expect(advice?.summary).toMatch(/2 pending/);
    expect(advice?.suggestions.some((s) => s.includes("idle"))).toBe(true);
    expect(advice?.suggestions.some((s) => /lockfile/i.test(s))).toBe(true);
  });
});
