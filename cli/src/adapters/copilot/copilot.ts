import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  renderExclusionYaml,
  renderInstructionsFile,
} from "../limits";
import type { PolicyFile, ProviderAdapter } from "../types";

export const copilotAdapter: ProviderAdapter = {
  id: "copilot",
  render(report: TokenRiskReport): PolicyFile[] {
    return [
      renderInstructionsFile(
        report,
        COPILOT_INSTRUCTIONS_PATH,
        "Copilot instructions (TokenForge)",
      ),
      {
        path: COPILOT_EXCLUSIONS_PATH,
        contents: renderExclusionYaml(report, [
          "# Copilot content-exclusion *candidates* for org/repo owners.",
          "# TokenForge does not call GitHub's org API. Paste or adapt these paths",
          "# into Copilot content exclusions if you want them enforced server-side.",
        ]),
      },
    ];
  },
};
