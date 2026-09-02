import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  detectContextProvider,
  getContextAdapter,
  type ContextProviderId,
  type ProviderContextAdapter,
} from "@tokenforge/context-adapters";
import { extensions, workspace } from "vscode";

type ContextProviderSetting = ContextProviderId | "auto";

/** Resolve session Shield adapter from workspace hints + installed extensions. */
export async function resolveContextAdapter(
  root: string,
): Promise<ProviderContextAdapter> {
  const configured = workspace
    .getConfiguration("tokenforge")
    .get<ContextProviderSetting>("contextProvider", "auto");

  if (configured !== "auto") {
    return getContextAdapter(configured);
  }

  const hasCopilot = extensions.getExtension("GitHub.copilot") !== undefined;
  const hasCursor = existsSync(join(root, ".cursor"));

  const id = await detectContextProvider(root, {
    copilot: hasCopilot,
    cursor: hasCursor,
  });

  return getContextAdapter(id);
}
