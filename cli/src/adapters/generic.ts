import type { TokenRiskReport } from "@tokenforge/risk-core";
import {
  GENERIC_EXCLUSIONS_PATH,
  GENERIC_INSTRUCTIONS_PATH,
  assertLeanInstruction,
} from "./limits";
import type { PolicyFile, ProviderAdapter } from "./types";

const INSTRUCTIONS = `# TokenForge instructions (generic)

Vendor-neutral keep/exclude hints for any Chat/Agent coding workflow.
Do not load lockfiles, generated bundles, or oversized dumps as context.

Prefer current source. Keep this file short.
`;

function exclusionYaml(report: TokenRiskReport): string {
  const lines = report.findings
    .filter((finding) => finding.action === "excluded")
    .map((finding) => `  - ${finding.path}`);

  return `# Generic exclusion pack (not a vendor billing/API file).
provider: generic
repo: ${JSON.stringify(report.repo)}
paths:
${lines.join("\n") || "  []"}
`;
}

export const genericAdapter: ProviderAdapter = {
  id: "generic",
  render(report: TokenRiskReport): PolicyFile[] {
    return [
      assertLeanInstruction({
        path: GENERIC_INSTRUCTIONS_PATH,
        contents: INSTRUCTIONS,
      }),
      {
        path: GENERIC_EXCLUSIONS_PATH,
        contents: exclusionYaml(report),
      },
    ];
  },
};
