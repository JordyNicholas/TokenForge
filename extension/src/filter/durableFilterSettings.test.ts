import { beforeEach, describe, expect, it, vi } from "vitest";

const inspect = vi.fn();
const update = vi.fn();

vi.mock("vscode", () => ({
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/tmp/repo" } }],
    getConfiguration: () => ({
      inspect,
      update,
    }),
  },
}));

describe("durableFilterSettings workspace scope", () => {
  beforeEach(() => {
    vi.resetModules();
    inspect.mockReset();
    update.mockReset();
    update.mockResolvedValue(undefined);
  });

  it("ignores user/global and defaults to off", async () => {
    inspect.mockReturnValue({
      key: "tokenforge.durableFilterDecisions",
      defaultValue: false,
      globalValue: true,
      workspaceValue: undefined,
      workspaceFolderValue: undefined,
    });

    const { isDurableFilterEnabled, setDurableFilterDecisions } = await import(
      "./durableFilterSettings"
    );

    expect(isDurableFilterEnabled()).toBe(false);

    await setDurableFilterDecisions(true);
    expect(update).toHaveBeenCalledWith("durableFilterDecisions", true, 2);
  });

  it("honors workspace value", async () => {
    inspect.mockReturnValue({
      key: "tokenforge.durableFilterDecisions",
      defaultValue: false,
      globalValue: false,
      workspaceValue: true,
      workspaceFolderValue: undefined,
    });

    const { isDurableFilterEnabled } = await import("./durableFilterSettings");
    expect(isDurableFilterEnabled()).toBe(true);
  });
});
