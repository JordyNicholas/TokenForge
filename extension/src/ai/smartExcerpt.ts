import { env, window } from "vscode";
import { estimateTokens } from "@tokenforge/risk-core";

const MAX_EXCERPT_CHARS = 2_000;

/** Copy bounded editor selection (or current line) for paste into agent chat. */
export async function copySmartExcerpt(): Promise<void> {
  const editor = window.activeTextEditor;
  if (!editor) {
    void window.showWarningMessage("Open a file and select text to copy a smart excerpt.");
    return;
  }

  const doc = editor.document;
  const selection = editor.selection;
  let text = doc.getText(selection);
  if (!text.trim()) {
    const line = doc.lineAt(selection.active.line);
    text = line.text;
  }

  const trimmed = text.trim().slice(0, MAX_EXCERPT_CHARS);
  if (!trimmed) {
    void window.showWarningMessage("Selection is empty.");
    return;
  }

  const rel = doc.uri.fsPath.split(/[/\\]/).pop() ?? doc.uri.fsPath;
  const header = `[${rel}:${selection.start.line + 1}] `;
  const payload = `${header}${trimmed}`;
  await env.clipboard.writeText(payload);
  void window.showInformationMessage(
    `Copied smart excerpt (~${estimateTokens(payload.length)} tokens). Paste into your agent chat.`,
  );
}
