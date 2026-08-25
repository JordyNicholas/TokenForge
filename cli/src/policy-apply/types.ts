import type { PolicyFile } from "../adapters";

/**
 * Remote org policy apply in-port (#99).
 * Vendor SDKs belong only in CLI adapters that implement this — not in risk-core.
 */
export type PolicyApplyProviderId = "fixture" | "copilot" | "cursor" | "claude" | string;

export type ApplyOrgPolicyRequest = {
  /** Org / tenant slug for live adapters. */
  org: string;
  /** Optional BU / business-unit label for Prove markers. */
  businessUnit?: string;
  /** Policy files rendered by the local Fix adapter (paths + contents). */
  files: PolicyFile[];
  /** Exclusion path globs derived from the scan (for adapters that take path lists). */
  exclusionPaths: string[];
  dryRun?: boolean;
};

export type ApplyOrgPolicyStatus = "applied" | "dry-run" | "manual" | "unsupported";

export type ApplyOrgPolicyResult = {
  provider: PolicyApplyProviderId;
  org: string;
  status: ApplyOrgPolicyStatus;
  /** Human-readable honesty note (API limits, admin UI steps, etc.). */
  message: string;
  /** Paths the adapter intended to push / stage. */
  paths: string[];
};

export type PolicyApplyProvider = {
  id: PolicyApplyProviderId;
  applyOrgPolicy(request: ApplyOrgPolicyRequest): Promise<ApplyOrgPolicyResult>;
};
