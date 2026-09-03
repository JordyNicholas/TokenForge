import { InputSnapshot, TabRegistry } from "./registry";
import { ExtensionContext, TextDocument, TextEditor, Uri, window, workspace } from "vscode";
import { isTokenforgeArtifactPath } from "../paths/tokenforgeArtifacts";
import { tabBytes } from "./tabBytes";

export type TrackTabsOptions = {
  /** Called after a tracked document is removed from the registry. */
  onClose?: (uri: string) => void;
};

export function trackTabs(
  registry: TabRegistry,
  context: ExtensionContext,
  options: TrackTabsOptions = {},
): void {
  for (const editor of window.visibleTextEditors) {
    upsertFromEditor(registry, editor, { focus: true });
  }

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        upsertFromEditor(registry, editor, { focus: true });
      } else {
        registry.setActiveUri(undefined);
      }
    }),

    workspace.onDidChangeTextDocument((event) => {
      upsertFromDocument(registry, event.document, { edit: true });
    }),

    workspace.onDidOpenTextDocument((document) => {
      upsertFromDocument(registry, document);
    }),

    workspace.onDidCloseTextDocument((document) => {
      if (!isTrackable(document)) return;
      const uri = document.uri.toString();
      registry.remove(uri);
      options.onClose?.(uri);
    }),
  );
}

function upsertFromEditor(
  registry: TabRegistry,
  editor: TextEditor,
  option?: { focus?: boolean; edit?: boolean },
): void {
  if (!isTrackable(editor.document)) return;
  const { uri } = editor.document;
  const snapshot: InputSnapshot = {
    path: tabPath(uri),
    bytes: tabBytes(editor.document),
    ...option,
  };
  registry.upsert(uri.toString(), snapshot, Date.now());
}

function upsertFromDocument(
  registry: TabRegistry,
  document: TextDocument,
  option?: { focus?: boolean; edit?: boolean },
): void {
  if (!isTrackable(document)) return;
  const { uri } = document;
  const snapshot: InputSnapshot = {
    path: tabPath(uri),
    bytes: tabBytes(document),
    ...option,
  };
  registry.upsert(uri.toString(), snapshot, Date.now());
}

function tabPath(uri: Uri): string {
  return workspace.asRelativePath(uri, false) ?? uri.fsPath.split(/[/\\]/).pop() ?? "untitled";
}

function isTrackable(document: TextDocument): boolean {
  if (document.uri.scheme !== "file") return false;
  if (document.fileName.endsWith(".git") && document.fileName !== ".git") return false;
  const rel = tabPath(document.uri);
  if (isTokenforgeArtifactPath(rel)) return false;
  return true;
}
