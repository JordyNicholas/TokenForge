import { UsageError } from "../app/errors";
import type {
  ApplyOrgPolicyRequest,
  ApplyOrgPolicyResult,
  PolicyApplyProvider,
} from "./types";

/**
 * Cursor org policy apply (#99) — honest stub until a stable org API exists.
 */
export function createCursorPolicyApplyProvider(): PolicyApplyProvider {
  return {
    id: "cursor",
    async applyOrgPolicy(
      request: ApplyOrgPolicyRequest,
    ): Promise<ApplyOrgPolicyResult> {
      if (!request.org?.trim()) {
        throw new UsageError("Cursor org-apply requires --org <organizationId>.");
      }
      const paths =
        request.exclusionPaths.length > 0
          ? request.exclusionPaths
          : request.files.map((file) => file.path);
      return {
        provider: "cursor",
        org: request.org,
        status: request.dryRun ? "dry-run" : "unsupported",
        message:
          "Cursor has no documented org content-exclusion push API for TokenForge. " +
          "Use local apply / org-pack files, then configure exclusions in Cursor admin. " +
          "No agent pipeline interception.",
        paths,
      };
    },
  };
}
