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

describe("autoFilterSettings workspace scope", () => {
  beforeEach(() => {
    vi.resetModules();
    inspect.mockReset();
    update.mockReset();
    update.mockResolvedValue(undefined);
  });

  it("ignores user/global and defaults to off", async () => {
    inspect.mockReturnValue({
      key: "tokenforge.autoFilterHighRisk",
      defaultValue: false,
      globalValue: true,
      workspaceValue: undefined,
      workspaceFolderValue: undefined,
    });

    const { isAutoFilterEnabled, setAutoFilterHighRisk } = await import(
      "./autoFilterSettings"
    );

    expect(isAutoFilterEnabled()).toBe(false);

    await setAutoFilterHighRisk(true);
    expect(update).toHaveBeenCalledWith("autoFilterHighRisk", true, 2);
  });

  it("honors workspace value", async () => {
    inspect.mockReturnValue({
      key: "tokenforge.autoFilterHighRisk",
      defaultValue: false,
      globalValue: false,
      workspaceValue: true,
      workspaceFolderValue: undefined,
    });

    const { isAutoFilterEnabled } = await import("./autoFilterSettings");
    expect(isAutoFilterEnabled()).toBe(true);
  });
});
