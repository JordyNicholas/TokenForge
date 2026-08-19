import { statSync } from "node:fs";
import { TextDocument } from "vscode";

export function tabBytes(document: TextDocument): number {
  if (document.isUntitled || document.isDirty) {
    return Buffer.byteLength(document.getText(), "utf8");
  }

  if (document.uri.scheme === "file") {
    try {
      return statSync(document.uri.fsPath).size;
    } catch {
      // Fall through
    }
  }


  return Buffer.byteLength(document.getText(), "utf8");
}