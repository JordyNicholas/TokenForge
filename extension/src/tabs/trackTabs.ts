import { InputSnapshot, TabRegistry } from "./registry";
import { TextDocument, TextEditor, Uri, window, workspace } from "vscode";

export function trackTabs(registry: TabRegistry): void {
  for (const editor of window.visibleTextEditors) {
    upsertFromEditor(registry, editor, { focus: true });
  }

  window.onDidChangeActiveTextEditor((editor) => {
    if (editor) upsertFromEditor(registry, editor, { focus: true });
  });

  workspace.onDidChangeTextDocument((event) => {
    upsertFromDocument(registry, event.document, { edit: true });
  });

  workspace.onDidOpenTextDocument((document) => {
    upsertFromDocument(registry, document);
  });

  workspace.onDidCloseTextDocument((document) => {
    registry.remove(document.uri.toString());
  });
}

function upsertFromEditor(registry: TabRegistry, editor: TextEditor, option?: { focus?: boolean, edit?: boolean }): void {
  const uri = Uri.from(editor.document.uri)
  const snapshot: InputSnapshot = {
    path: tabPath(uri),
    bytes: tabBytes(editor.document),
    ...option,
  };
  registry.upsert(uri.toString(), snapshot, Date.now());
}

function upsertFromDocument(registry: TabRegistry, document: TextDocument, option?: { focus?: boolean, edit?: boolean }): void {
  const uri = Uri.from(document.uri);
  const snapshot: InputSnapshot = {
    path: tabPath(uri),
    bytes: tabBytes(document),
    ...option,
  };
  registry.upsert(uri.toString(), snapshot, Date.now());
}

export function tabPath(uri: Uri): string {
  return workspace.asRelativePath(uri, false) ?? uri.fsPath.split(/[/\\]/).pop() ?? "untitled";
}

export function tabBytes(doc: TextDocument): number {
  return Buffer.byteLength(doc.getText(), "utf8");
}