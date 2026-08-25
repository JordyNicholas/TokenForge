import { UsageError } from "../app/errors";
import type {
  ApplyOrgPolicyRequest,
  ApplyOrgPolicyResult,
  PolicyApplyProvider,
} from "./types";

/**
 * Claude org policy apply (#99) — honest stub until a stable org API exists.
 */
export function createClaudePolicyApplyProvider(): PolicyApplyProvider {
  return {
    id: "claude",
    async applyOrgPolicy(
      request: ApplyOrgPolicyRequest,
    ): Promise<ApplyOrgPolicyResult> {
      if (!request.org?.trim()) {
        throw new UsageError("Claude org-apply requires --org <org-id>.");
      }
      const paths =
        request.exclusionPaths.length > 0
          ? request.exclusionPaths
          : request.files.map((file) => file.path);
      return {
        provider: "claude",
        org: request.org,
        status: request.dryRun ? "dry-run" : "unsupported",
        message:
          "Claude / Anthropic has no documented org content-exclusion push API for TokenForge. " +
          "Use local apply / org-pack files and configure CLAUDE.md / project exclusions manually. " +
          "No agent pipeline interception.",
        paths,
      };
    },
  };
}
