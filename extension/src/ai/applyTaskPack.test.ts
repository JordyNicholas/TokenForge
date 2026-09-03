import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: () => undefined }) },
  ConfigurationTarget: { Workspace: 1 },
}));

import type { ShieldSession } from "../session/shieldSession";
import type { TrackedTab } from "../tabs/types";
import { applyTaskContextPack, formatTaskPackClipboard } from "./applyTaskPack";
import type { TaskContextPack } from "./taskContextPack";

function tab(path: string, uri = `file:///${path}`): TrackedTab {
  return {
    uri,
    path,
    bytes: 100,
    lastActivityAt: Date.now(),
    lastFocusAt: Date.now(),
    lastEditAt: Date.now(),
    assessment: {
      path,
      bytes: 100,
      estTokens: 25,
      fileClass: "source",
      score: 1,
      atRisk: true,
      reasons: ["inactive_tab"],
    },
  };
}

describe("applyTaskContextPack", () => {
  it("never shields the focused tab even when it is outside the pack", async () => {
    const lock = tab("package-lock.json");
    const source = tab("src/app.ts");
    const allow = vi.fn();
    const shield = vi.fn();
    const session = {
      listPendingAtRisk: () => [lock, source],
      registry: { getActiveUri: () => source.uri },
      allow,
      shield,
    } as unknown as ShieldSession;

    const pack: TaskContextPack = {
      paths: ["package-lock.json"],
      estTokens: 25,
      note: "test",
      source: "heuristic",
    };

    const changes = await applyTaskContextPack(session, pack);
    expect(changes).toBe(2);
    expect(allow).toHaveBeenCalledWith(source.uri);
    expect(allow).toHaveBeenCalledWith(lock.uri);
    expect(shield).not.toHaveBeenCalled();
  });

  it("soft-shields pending noise that is not focused and not in the pack", async () => {
    const lock = tab("package-lock.json");
    const source = tab("src/app.ts");
    const allow = vi.fn();
    const shield = vi.fn();
    const session = {
      listPendingAtRisk: () => [lock, source],
      registry: { getActiveUri: () => source.uri },
      allow,
      shield,
    } as unknown as ShieldSession;

    await applyTaskContextPack(session, {
      paths: ["src/app.ts"],
      estTokens: 25,
      note: "test",
      source: "llm",
    });

    expect(allow).toHaveBeenCalledWith(source.uri);
    expect(shield).toHaveBeenCalledWith(lock.uri, { mode: "soft" });
  });

  it("formats a paste-safe clipboard pack", () => {
    const text = formatTaskPackClipboard({
      paths: ["src/app.ts"],
      estTokens: 40,
      note: "Focused source.",
      source: "llm",
    });
    expect(text).toContain("src/app.ts");
    expect(text).toContain("not injected");
  });
});
