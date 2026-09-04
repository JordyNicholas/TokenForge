import { ConfigurationTarget, window, workspace } from "vscode";

/** Prompt to set tokenforge.team in workspace settings. */
export async function setTeamLabel(): Promise<string | undefined> {
  const config = workspace.getConfiguration("tokenforge");
  const current = config.get<string>("team") ?? "default";
  const input = await window.showInputBox({
      title: "TokenForge team label",
      prompt: "Team id written into exports and inbox paths (not local/default)",
      value: current === "default" ? "" : current,
      placeHolder: "e.g. payments",
      ignoreFocusOut: true,
    });
  if (!input) {
    return undefined;
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  await config.update("team", trimmed, ConfigurationTarget.Workspace);
  return trimmed;
}
