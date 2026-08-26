import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  renderExclusionYaml,
  renderInstructionsFile,
} from "../limits";
import type { PolicyFile, ProviderAdapter } from "../types";

/**
 * Claude conventional instruction path. Apply merges a TokenForge-managed
 * section into this file (#130).
 */
export const CLAUDE_INSTRUCTIONS_PATH = "CLAUDE.md";
/** @deprecated Alias — same as {@link CLAUDE_INSTRUCTIONS_PATH}. */
export const CLAUDE_CANONICAL_INSTRUCTIONS_PATH = CLAUDE_INSTRUCTIONS_PATH;
export const CLAUDE_EXCLUSIONS_PATH = ".claude/tokenforge-exclusion-candidates.yml";

export const claudeAdapter: ProviderAdapter = {
  id: "claude",
  render(report: TokenRiskReport): PolicyFile[] {
    return [
      renderInstructionsFile(
        report,
        CLAUDE_INSTRUCTIONS_PATH,
        "Claude / Codex instructions (TokenForge)",
      ),
      {
        path: CLAUDE_EXCLUSIONS_PATH,
        contents: renderExclusionYaml(report, [
          "# Claude exclusion *candidates* for repo owners.",
          "# TokenForge writes local policy files only — it does not call Anthropic org APIs.",
        ]),
      },
    ];
  },
};
