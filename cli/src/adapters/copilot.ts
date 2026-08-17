import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  COPILOT_EXCLUSIONS_PATH,
  COPILOT_INSTRUCTIONS_PATH,
  assertLeanInstruction,
} from "./limits";
import type { PolicyFile, ProviderAdapter } from "./types";

const INSTRUCTIONS = `# Copilot instructions (TokenForge)

Keep Chat/Agent context small. Prefer source over lockfiles, generated trees,
and oversized dumps. Do not paste those files into the prompt.

## Exclude from context
- Lockfiles and package graphs
- \`dist/\`, \`build/\`, coverage, and other generated output
- Fat config/export dumps

## Prefer
- Current source under \`src/\`
- Short, living config — not legacy XML/JSON dumps

This file is intentionally short. Do not append logs, lockfile excerpts, or
vendor billing notes.
`;

function exclusionYaml(report: TokenRiskReport): string {
  const lines = report.findings
    .filter((finding) => finding.action === "excluded")
    .map((finding) => `  - ${finding.path}`);

  return `# Copilot content-exclusion *candidates* for org/repo owners.
# TokenForge does not call GitHub's org API. Paste or adapt these paths
# into Copilot content exclusions if you want them enforced server-side.
provider: copilot
repo: ${JSON.stringify(report.repo)}
paths:
${lines.join("\n") || "  []"}
`;
}

export const copilotAdapter: ProviderAdapter = {
  id: "copilot",
  render(report: TokenRiskReport): PolicyFile[] {
    return [
      assertLeanInstruction({
        path: COPILOT_INSTRUCTIONS_PATH,
        contents: INSTRUCTIONS,
      }),
      {
        path: COPILOT_EXCLUSIONS_PATH,
        contents: exclusionYaml(report),
      },
    ];
  },
};
