import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  isTokenForgeConfig,
  type TokenForgeConfig,
} from "@tokenforge/risk-core";

export async function readTokenForgeConfig(
  root: string,
): Promise<TokenForgeConfig | undefined> {
  const path = join(root, ".tokenforge", "config.json");
  try {
    const raw = await readFile(path, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isTokenForgeConfig(parsed)) {
      return undefined;
    }
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return undefined;
    }
    return undefined;
  }
}
