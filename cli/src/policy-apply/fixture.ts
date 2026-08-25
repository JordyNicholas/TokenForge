import { UsageError } from "../app/errors";
import type {
  ApplyOrgPolicyRequest,
  ApplyOrgPolicyResult,
  PolicyApplyProvider,
} from "./types";

export type FixturePolicyApplyOptions = {
  /**
   * When set, reject requests whose `org` differs.
   * Fixture has no live auth — this only guards demo wiring.
   */
  org?: string;
};

/**
 * File / demo PolicyApplyProvider. No vendor SDK — #99 port boundary.
 * Records a successful apply (or dry-run) for tests and offline demos.
 */
export function createFixturePolicyApplyProvider(
  options: FixturePolicyApplyOptions = {},
): PolicyApplyProvider {
  return {
    id: "fixture",
    async applyOrgPolicy(
      request: ApplyOrgPolicyRequest,
    ): Promise<ApplyOrgPolicyResult> {
      if (!request.org?.trim()) {
        throw new UsageError("org-apply requires a non-empty --org.");
      }
      if (
        options.org !== undefined &&
        request.org !== options.org
      ) {
        throw new UsageError(
          `Fixture org mismatch: configured "${options.org}", request "${request.org}".`,
        );
      }
      const paths =
        request.exclusionPaths.length > 0
          ? request.exclusionPaths
          : request.files.map((file) => file.path);
      if (request.dryRun) {
        return {
          provider: "fixture",
          org: request.org,
          status: "dry-run",
          message: "Fixture dry-run — no remote call.",
          paths,
        };
      }
      return {
        provider: "fixture",
        org: request.org,
        status: "applied",
        message: "Fixture applied org policy locally (no vendor API).",
        paths,
      };
    },
  };
}
