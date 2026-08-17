import { INACTIVE_MS, scoreRisk } from "@tokenforge/risk-core";

/** Placeholder until E4 (#20) scaffolds the VS Code extension. */
export function extensionPlaceholder(): boolean {
  return scoreRisk({ path: "src/index.ts", bytes: 0, inactiveMs: 0 }).score <
    scoreRisk({ path: "src/index.ts", bytes: 0, inactiveMs: INACTIVE_MS }).score;
}
