import { UsageError } from "../app/errors";
import type {
  ApplyOrgPolicyRequest,
  ApplyOrgPolicyResult,
  PolicyApplyProvider,
} from "./types";

/**
 * Copilot org policy apply (#99).
 * GitHub does not expose a public REST API to push Copilot content exclusions for an
 * org — owners still apply packs in the Copilot admin UI. This adapter stages the
 * payload and returns `manual` so Fix stays honest.
 */
export function createCopilotPolicyApplyProvider(): PolicyApplyProvider {
  return {
    id: "copilot",
    async applyOrgPolicy(
      request: ApplyOrgPolicyRequest,
    ): Promise<ApplyOrgPolicyResult> {
      if (!request.org?.trim()) {
        throw new UsageError("Copilot org-apply requires --org <github-org>.");
      }
      const paths =
        request.exclusionPaths.length > 0
          ? request.exclusionPaths
          : request.files.map((file) => file.path);
      if (request.dryRun) {
        return {
          provider: "copilot",
          org: request.org,
          status: "dry-run",
          message:
            "Would stage Copilot org exclusion candidates for admin UI review (no public push API).",
          paths,
        };
      }
      return {
        provider: "copilot",
        org: request.org,
        status: "manual",
        message:
          `No public GitHub API to push Copilot content exclusions for org "${request.org}". ` +
          "Review staged files under .tokenforge/org-apply/ and apply in Copilot org settings. " +
          "TokenForge does not intercept the agent pipeline.",
        paths,
      };
    },
  };
}
