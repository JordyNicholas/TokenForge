import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: () => undefined }) },
}));

const { isExternalBackend } = await import("./settings");

describe("isExternalBackend", () => {
  it("treats both CLI backends as external", () => {
    // A CLI signed in to a vendor account is still the network. Excerpts leave
    // the machine whether they travel over an API key or a subscription login.
    expect(isExternalBackend("claude-code")).toBe(true);
    expect(isExternalBackend("codex")).toBe(true);
  });

  it("treats the hosted API as external and local inference as local", () => {
    expect(isExternalBackend("anthropic")).toBe(true);
    expect(isExternalBackend("ollama")).toBe(false);
    expect(isExternalBackend("noop")).toBe(false);
  });

  it("defaults an unrecognized backend to external", () => {
    // The classifier is an allowlist of local backends, so a backend added to
    // LlmBackendId without touching this file is gated rather than silently
    // exempted — the safe direction to be wrong in.
    expect(isExternalBackend("some-future-backend" as never)).toBe(true);
  });
});
