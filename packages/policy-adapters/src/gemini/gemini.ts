import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  renderExclusionYaml,
  renderInstructionsFile,
} from "../limits";
import type { PolicyFile, ProviderAdapter } from "../types";

/**
 * Gemini CLI project context path (default context.fileName).
 * Apply merges a TokenForge-managed section into this file.
 */
export const GEMINI_INSTRUCTIONS_PATH = "GEMINI.md";
export const GEMINI_EXCLUSIONS_PATH = ".gemini/tokenforge-exclusion-candidates.yml";

export const geminiAdapter: ProviderAdapter = {
  id: "gemini",
  render(report, context): PolicyFile[] {
    return [
      renderInstructionsFile(
        report,
        GEMINI_INSTRUCTIONS_PATH,
        "Gemini instructions (TokenForge)",
        {
          managedBody: context?.managedInstructionBodies?.get(
            GEMINI_INSTRUCTIONS_PATH,
          ),
          maxBytes: context?.policyMaxBytes,
          keepDirs: context?.keepDirs,
        },
      ),
      {
        path: GEMINI_EXCLUSIONS_PATH,
        contents: renderExclusionYaml(
          report,
          [
            "# Gemini exclusion *candidates* for repo owners.",
            "# TokenForge writes local policy files only — it does not call Google org APIs.",
            "# Adapt these paths into .geminiignore or project settings if you want them enforced.",
          ],
          { keepDirs: context?.keepDirs },
        ),
      },
    ];
  },
};
