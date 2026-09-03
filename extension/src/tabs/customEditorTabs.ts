import { statSync } from "node:fs";
import {
  type ExtensionContext,
  type Tab,
  TabInputCustom,
  type Uri,
  window,
  workspace,
} from "vscode";
import type { InputSnapshot } from "./registry";
import { TabRegistry } from "./registry";

/**
 * File URIs open in a custom editor (image preview, etc.), keyed by
 * `uri.toString()`. These never fire the `TextDocument` events `trackTabs`
 * listens to, so a `.svg`/`.png` opened in VS Code's image preview is scored as
 * `media` by risk-core but was invisible in Open tabs. Read from `tabGroups`.
 */
export function collectCustomEditorFileUris(): Map<string, Uri> {
  const uris = new Map<string, Uri>();
  for (const group of window.tabGroups.all) {
    for (const tab of group.tabs) {
      const uri = customEditorFileUri(tab);
      if (uri) {
        uris.set(uri.toString(), uri);
      }
    }
  }
  return uris;
}

function customEditorFileUri(tab: Tab): Uri | undefined {
  const input = tab.input;
  if (input instanceof TabInputCustom && input.uri.scheme === "file") {
    return input.uri;
  }
  return undefined;
}

/**
 * Track non-text editor tabs (image previews and other custom editors) in the
 * risk registry, reconciling against `tabGroups` on every change so binary
 * context (media) surfaces in Open tabs alongside text tabs.
 */
export function trackCustomEditorTabs(
  registry: TabRegistry,
  context: ExtensionContext,
): void {
  const tracked = new Set<string>();

  const reconcile = (): void => {
    const open = collectCustomEditorFileUris();
    for (const [key, uri] of open) {
      if (tracked.has(key)) {
        continue;
      }
      const bytes = fileBytes(uri);
      if (bytes === undefined) {
        continue;
      }
      const snapshot: InputSnapshot = { path: tabPath(uri), bytes };
      registry.upsert(key, snapshot);
      tracked.add(key);
    }
    for (const key of [...tracked]) {
      if (!open.has(key)) {
        registry.remove(key);
        tracked.delete(key);
      }
    }
  };

  reconcile();
  context.subscriptions.push(
    window.tabGroups.onDidChangeTabs(() => reconcile()),
  );
}

function fileBytes(uri: Uri): number | undefined {
  try {
    return statSync(uri.fsPath).size;
  } catch {
    return undefined;
  }
}

function tabPath(uri: Uri): string {
  return (
    workspace.asRelativePath(uri, false) ??
    uri.fsPath.split(/[/\\]/).pop() ??
    "untitled"
  );
}
