import { INACTIVE_MS } from "@tokenforge/risk-core";
import { describe, expect, it } from "vitest";
import { TabRegistry } from "./registry";

describe("TabRegistry", () => {
  it("updates focus and edit timestamps independently", () => {
    const registry = new TabRegistry();
    const focusAt = 1_000;
    const editAt = 5_000;

    registry.upsert("file:///a.ts", { path: "src/a.ts", bytes: 100, focus: true }, focusAt);
    registry.upsert("file:///a.ts", { path: "src/a.ts", bytes: 100, edit: true }, editAt);

    const [tab] = registry.list(editAt);
    expect(tab.lastFocusAt).toBe(focusAt);
    expect(tab.lastEditAt).toBe(editAt);
    expect(tab.lastActivityAt).toBe(editAt);
  });

  it("refresh rescores all tracked tabs", () => {
    const registry = new TabRegistry();
    registry.upsert("file:///a.ts", { path: "src/a.ts", bytes: 100, focus: true }, 0);
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 1_000, focus: true },
      0,
    );

    registry.refresh(INACTIVE_MS);

    expect(registry.list()).toHaveLength(2);
    expect(registry.listAtRisk(INACTIVE_MS)).toHaveLength(2);
  });

  it("remove drops tabs from listAtRisk", () => {
    const registry = new TabRegistry();
    registry.upsert(
      "file:///lock",
      { path: "package-lock.json", bytes: 2_400_000, focus: true },
      Date.now(),
    );

    registry.remove("file:///lock");

    expect(registry.listAtRisk()).toEqual([]);
  });
});
