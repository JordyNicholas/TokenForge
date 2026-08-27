import { commands, workspace, type ExtensionContext } from "vscode";
import {
  isEligibleWorkspaceRoot,
  type WorkspaceMode,
} from "./eligibility";

export const WORKSPACE_ELIGIBLE_CONTEXT = "tokenforge.workspaceEligible";

export function workspaceMode(): WorkspaceMode {
  const value = workspace.getConfiguration("tokenforge").get<string>("workspaceMode");
  if (
    value === "always" ||
    value === "git-only" ||
    value === "manifest-only"
  ) {
    return value;
  }
  return "auto";
}

function primaryWorkspaceRoot(): string | undefined {
  return workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function isEligibleWorkspace(mode: WorkspaceMode = workspaceMode()): boolean {
  if (mode === "always") {
    return primaryWorkspaceRoot() !== undefined;
  }
  const root = primaryWorkspaceRoot();
  if (!root) {
    return false;
  }
  return isEligibleWorkspaceRoot(root, mode);
}

export async function syncWorkspaceEligibleContext(): Promise<boolean> {
  const eligible = isEligibleWorkspace();
  await commands.executeCommand("setContext", WORKSPACE_ELIGIBLE_CONTEXT, eligible);
  return eligible;
}

export function watchWorkspaceEligibility(
  context: ExtensionContext,
  onChange?: () => void,
): void {
  const refresh = (): void => {
    void syncWorkspaceEligibleContext().then(() => {
      onChange?.();
    });
  };

  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders(refresh),
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("tokenforge.workspaceMode")) {
        refresh();
      }
    }),
  );
}
