import { describe, expect, it, vi } from "vitest";
import { TabFilterStore } from "./filterStore";

describe("TabFilterStore", () => {
  it("defaults unknown URIs to pending", () => {
    const store = new TabFilterStore();
    expect(store.get("file:///a.ts")).toBe("pending");
  });

  it("records keep and filter decisions", () => {
    const store = new TabFilterStore();
    store.set("file:///a.ts", "kept");
    store.set("file:///b.ts", "filtered");

    expect(store.get("file:///a.ts")).toBe("kept");
    expect(store.get("file:///b.ts")).toBe("filtered");
  });

  it("clear removes a decision back to pending", () => {
    const store = new TabFilterStore();
    store.set("file:///a.ts", "filtered");
    store.clear("file:///a.ts");

    expect(store.get("file:///a.ts")).toBe("pending");
  });

  it("notifies listeners on set and clear, not on no-ops", () => {
    const store = new TabFilterStore();
    const listener = vi.fn();
    store.onDidChange(listener);

    store.set("file:///a.ts", "filtered");
    store.set("file:///a.ts", "filtered");
    store.clear("file:///a.ts");
    store.clear("file:///a.ts");

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
