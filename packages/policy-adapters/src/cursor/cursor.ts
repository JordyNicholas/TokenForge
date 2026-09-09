import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  renderExclusionYaml,
  renderIgnoreCandidates,
  renderInstructionsFile,
} from "../limits";
import { renderCursorScopedRules } from "./scoped-rules";
import type { PolicyFile, ProviderAdapter } from "../types";

export const CURSOR_INSTRUCTIONS_PATH = ".cursor/rules/tokenforge.mdc";
export const CURSOR_EXCLUSIONS_PATH = ".cursor/tokenforge-exclusion-candidates.yml";
export const CURSOR_IGNORE_CANDIDATES_PATH =
  ".cursor/tokenforge-cursorignore-candidates";

export const cursorAdapter: ProviderAdapter = {
  id: "cursor",
  render(report, context): PolicyFile[] {
    return [
      renderInstructionsFile(
        report,
        CURSOR_INSTRUCTIONS_PATH,
        "Cursor rules (TokenForge)",
        {
          managedBody: context?.managedInstructionBodies?.get(
            CURSOR_INSTRUCTIONS_PATH,
          ),
          maxBytes: context?.policyMaxBytes,
          keepDirs: context?.keepDirs,
        },
      ),
      {
        path: CURSOR_EXCLUSIONS_PATH,
        contents: renderExclusionYaml(
          report,
          [
            "# Cursor exclusion *candidates* for repo owners.",
            "# TokenForge writes local policy files only — it does not call Cursor APIs.",
          ],
          { keepDirs: context?.keepDirs },
        ),
      },
      {
        path: CURSOR_IGNORE_CANDIDATES_PATH,
        contents: renderIgnoreCandidates(
          report,
          [
            "# Cursor .cursorignore *candidates* — human review required.",
            "# TokenForge writes local policy files only — it does not call Cursor APIs.",
          ],
          { keepDirs: context?.keepDirs },
        ),
      },
      // Glob-scoped reasoning rules. Cursor is the only provider that can load
      // a rule conditionally, so the routing table lives here rather than in
      // the always-on file - see `renderCursorScopedRules`.
      ...renderCursorScopedRules(context?.scopedReasoningRules ?? []),
    ];
  },
};
