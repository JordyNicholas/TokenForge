/**
 * Prove trail event written when Fix applies a policy pack.
 * Bounds before/after billing windows — not a claim of 100% causal invoice delta.
 */

export type ProveChangeAction = "apply" | "org-pack";

export type ProveChangeMarker = {
  /** ISO-8601 when the pack was written. */
  timestamp: string;
  /** Provider adapter id used for the pack (copilot, cursor, …). */
  provider: string;
  /** Stable-enough id for the pack event (e.g. apply:copilot). */
  packId: string;
  action: ProveChangeAction;
  /** Team from the scan report when known. */
  team?: string;
  /** Org / BU from org-pack when known. */
  businessUnit?: string;
  /** Repo label from the scan report when known. */
  repo?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

export function isProveChangeMarker(value: unknown): value is ProveChangeMarker {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.timestamp !== "string" || !value.timestamp) {
    return false;
  }
  if (typeof value.provider !== "string" || !value.provider) {
    return false;
  }
  if (typeof value.packId !== "string" || !value.packId) {
    return false;
  }
  if (value.action !== "apply" && value.action !== "org-pack") {
    return false;
  }
  return (
    optionalNonEmptyString(value.team) &&
    optionalNonEmptyString(value.businessUnit) &&
    optionalNonEmptyString(value.repo)
  );
}

export function buildPackId(
  action: ProveChangeAction,
  provider: string,
  businessUnit?: string,
): string {
  if (action === "org-pack" && businessUnit) {
    return `org-pack:${provider}:${businessUnit}`;
  }
  return `${action}:${provider}`;
}
