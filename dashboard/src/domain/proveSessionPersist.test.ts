import { describe, expect, it, vi } from "vitest";
import {
  PROVE_SESSION_MAX_BYTES,
  PROVE_SESSION_STORAGE_KEY,
  buildProveSessionSnapshot,
  hasStoredProveSession,
  loadProveSessionSnapshot,
  proveSessionPayloadBytes,
  saveProveSession,
  shouldAutoRestoreProveSession,
} from "./proveSessionPersist";

const sampleInput = {
  sourceLabel: "org-prove-pack.json",
  packJsonText: '{"schemaVersion":1}',
  markers: [],
  changeMarkersLabel: "org-prove-pack.json",
  sessionStatsEntries: [],
  discoverEntries: [],
  coverage: null,
  provePackLabel: "org-prove-pack.json",
  sessionStatsLabel: null,
  discoverLatestLabel: null,
  usageLabel: null,
};

describe("proveSessionPersist", () => {
  it("builds a versioned snapshot", () => {
    const snap = buildProveSessionSnapshot(sampleInput);
    expect(snap.version).toBe(1);
    expect(snap.sourceLabel).toBe("org-prove-pack.json");
    expect(snap.packJsonText).toBe('{"schemaVersion":1}');
    expect(snap.savedAt).toMatch(/^\d{4}-/);
  });

  it("saves and loads from localStorage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    expect(saveProveSession(sampleInput)).toBe(true);
    expect(hasStoredProveSession()).toBe(true);
    const loaded = loadProveSessionSnapshot();
    expect(loaded?.sourceLabel).toBe("org-prove-pack.json");
    expect(loaded?.packJsonText).toBe('{"schemaVersion":1}');

    vi.unstubAllGlobals();
  });

  it("skips persist when payload exceeds cap", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const huge = "x".repeat(PROVE_SESSION_MAX_BYTES);
    expect(saveProveSession({ ...sampleInput, packJsonText: huge })).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("detects ?restore=1", () => {
    expect(shouldAutoRestoreProveSession("?restore=1")).toBe(true);
    expect(shouldAutoRestoreProveSession("?restore=0")).toBe(false);
    expect(shouldAutoRestoreProveSession("")).toBe(false);
  });

  it("reports payload byte size", () => {
    const snap = buildProveSessionSnapshot(sampleInput);
    expect(proveSessionPayloadBytes(snap)).toBeGreaterThan(0);
  });

  it("uses storage key constant", () => {
    expect(PROVE_SESSION_STORAGE_KEY).toBe("tokenforge-prove-session-v1");
  });
});
