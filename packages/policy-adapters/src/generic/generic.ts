import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  GENERIC_EXCLUSIONS_PATH,
  GENERIC_INSTRUCTIONS_PATH,
  renderExclusionYaml,
  renderInstructionsFile,
} from "../limits";
import type { PolicyFile, ProviderAdapter } from "../types";

export const genericAdapter: ProviderAdapter = {
  id: "generic",
  render(report, context): PolicyFile[] {
    return [
      renderInstructionsFile(
        report,
        GENERIC_INSTRUCTIONS_PATH,
        "TokenForge instructions (generic)",
        {
          managedBody: context?.managedInstructionBodies?.get(
            GENERIC_INSTRUCTIONS_PATH,
          ),
          maxBytes: context?.policyMaxBytes,
          keepDirs: context?.keepDirs,
        },
      ),
      {
        path: GENERIC_EXCLUSIONS_PATH,
        contents: renderExclusionYaml(
          report,
          ["# Generic exclusion pack (not a vendor billing/API file)."],
          { keepDirs: context?.keepDirs },
        ),
      },
    ];
  },
};
