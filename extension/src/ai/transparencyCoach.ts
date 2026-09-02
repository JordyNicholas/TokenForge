import { window, workspace } from "vscode";

export type LlmPreflight = {
  paths: readonly string[];
  totalBytes: number;
  backend: string;
};

/** Preflight consent before sending data to an external LLM backend. */
export async function confirmExternalLlmSend(
  preflight: LlmPreflight,
): Promise<boolean> {
  const allowExternal = workspace
    .getConfiguration("tokenforge")
    .get<boolean>("allowExternalLlm", false);
  if (allowExternal) {
    return true;
  }

  const detail = [
    `Backend: ${preflight.backend}`,
    `Paths: ${preflight.paths.slice(0, 8).join(", ")}${preflight.paths.length > 8 ? "…" : ""}`,
    `~${preflight.totalBytes} bytes may leave this machine.`,
  ].join("\n");

  const choice = await window.showWarningMessage(
    "TokenForge will send instruction excerpts to an external LLM.",
    { modal: true, detail },
    "Allow once",
    "Cancel",
  );
  return choice === "Allow once";
}

/** Always show local preflight (noop / ollama) in output for transparency. */
export function logLocalPreflight(preflight: LlmPreflight): void {
  void window.setStatusBarMessage(
    `TokenForge analyze: ${preflight.paths.length} path(s), ~${preflight.totalBytes} bytes (${preflight.backend})`,
    4000,
  );
}
