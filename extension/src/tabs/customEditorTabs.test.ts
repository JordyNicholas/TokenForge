import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => {
  class TabInputCustom {
    constructor(
      readonly uri: unknown,
      readonly viewType: string,
    ) {}
  }
  class TabInputText {
    constructor(readonly uri: unknown) {}
  }
  return {
    TabInputCustom,
    TabInputText,
    window: { tabGroups: { all: [] as unknown[] } },
    workspace: { asRelativePath: (uri: { path: string }) => uri.path },
  };
});

function fileUri(fsPath: string) {
  return { scheme: "file", fsPath, path: fsPath, toString: () => `file://${fsPath}` };
}

type VscodeMock = {
  TabInputCustom: new (uri: unknown, viewType: string) => unknown;
  TabInputText: new (uri: unknown) => unknown;
  window: { tabGroups: { all: unknown[] } };
};

describe("collectCustomEditorFileUris", () => {
  beforeEach(async () => {
    const vscode = (await import("vscode")) as unknown as VscodeMock;
    vscode.window.tabGroups.all = [];
  });

  it("returns file-scheme custom-editor tabs and ignores text / non-file tabs", async () => {
    const vscode = (await import("vscode")) as unknown as VscodeMock;

    vscode.window.tabGroups.all = [
      {
        tabs: [
          {
            input: new vscode.TabInputCustom(
              fileUri("/w/assets/add.svg"),
              "imagePreview.previewEditor",
            ),
          },
          // Text editors are handled by trackTabs, not here.
          { input: new vscode.TabInputText(fileUri("/w/src/app.ts")) },
          // Non-file custom editors (e.g. untitled) are skipped.
          {
            input: new vscode.TabInputCustom(
              { scheme: "untitled", fsPath: "", path: "x", toString: () => "untitled:x" },
              "vt",
            ),
          },
          // Terminals / webviews have no matching input.
          { input: undefined },
        ],
      },
      {
        tabs: [
          {
            input: new vscode.TabInputCustom(
              fileUri("/w/media/logo.png"),
              "imagePreview.previewEditor",
            ),
          },
        ],
      },
    ];

    const { collectCustomEditorFileUris } = await import("./customEditorTabs");
    const uris = collectCustomEditorFileUris();

    expect([...uris.values()].map((u) => (u as { fsPath: string }).fsPath).sort()).toEqual([
      "/w/assets/add.svg",
      "/w/media/logo.png",
    ]);
  });

  it("returns an empty map when nothing is open", async () => {
    const { collectCustomEditorFileUris } = await import("./customEditorTabs");
    expect(collectCustomEditorFileUris().size).toBe(0);
  });
});
