import { UsageError } from "../app/errors";
import { createClaudePolicyApplyProvider } from "./claude";
import { createCopilotPolicyApplyProvider } from "./copilot";
import { createCursorPolicyApplyProvider } from "./cursor";
import {
  createFixturePolicyApplyProvider,
  type FixturePolicyApplyOptions,
} from "./fixture";
import type { PolicyApplyProvider, PolicyApplyProviderId } from "./types";

export type ResolvePolicyApplyProviderOptions = {
  fixture?: FixturePolicyApplyOptions;
};

const SUPPORTED = "fixture, copilot, cursor, claude";

/**
 * Resolve a remote org PolicyApply adapter (#99).
 * `fixture` = offline demo; live ids return honest manual/unsupported when no API.
 */
export function getPolicyApplyProvider(
  id: PolicyApplyProviderId,
  options: ResolvePolicyApplyProviderOptions = {},
): PolicyApplyProvider {
  if (id === "fixture") {
    return createFixturePolicyApplyProvider(options.fixture ?? {});
  }
  if (id === "copilot") {
    return createCopilotPolicyApplyProvider();
  }
  if (id === "cursor") {
    return createCursorPolicyApplyProvider();
  }
  if (id === "claude") {
    return createClaudePolicyApplyProvider();
  }
  throw new UsageError(
    `Unknown policy-apply provider "${id}". Supported: ${SUPPORTED}.`,
  );
}
