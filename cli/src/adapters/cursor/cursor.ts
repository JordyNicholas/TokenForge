import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  renderExclusionYaml,
  renderInstructionsFile,
} from "../limits";
import type { PolicyFile, ProviderAdapter } from "../types";

export const CURSOR_INSTRUCTIONS_PATH = ".cursor/rules/tokenforge.mdc";
export const CURSOR_EXCLUSIONS_PATH = ".cursor/tokenforge-exclusion-candidates.yml";

export const cursorAdapter: ProviderAdapter = {
  id: "cursor",
  render(report: TokenRiskReport): PolicyFile[] {
    return [
      renderInstructionsFile(
        report,
        CURSOR_INSTRUCTIONS_PATH,
        "Cursor rules (TokenForge)",
      ),
      {
        path: CURSOR_EXCLUSIONS_PATH,
        contents: renderExclusionYaml(report, [
          "# Cursor exclusion *candidates* for repo owners.",
          "# TokenForge writes local policy files only — it does not call Cursor APIs.",
        ]),
      },
    ];
  },
};
