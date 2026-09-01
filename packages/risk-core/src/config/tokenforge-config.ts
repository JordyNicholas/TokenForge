import {
  DEFAULT_HEURISTIC_POLICY_MAX_BYTES,
  DEFAULT_HYBRID_POLICY_MAX_BYTES,
} from "../domain/constants";

export type ApplyMode = "heuristic" | "hybrid";

export type EnrichmentTierSetting = "auto" | "local" | "vendor";

export type TokenForgeConfig = {
  scan?: {
    enrichmentTier?: EnrichmentTierSetting;
    localMaxCandidates?: number;
  };
  apply?: {
    mode?: ApplyMode;
    policyMaxBytes?: number;
  };
};

export type ResolvePolicyMaxBytesOptions = {
  applyMode?: ApplyMode;
  config?: TokenForgeConfig;
  cliOverride?: number;
};

export function resolvePolicyMaxBytes(
  options: ResolvePolicyMaxBytesOptions = {},
): number {
  if (
    options.cliOverride !== undefined &&
    Number.isFinite(options.cliOverride) &&
    options.cliOverride > 0
  ) {
    return Math.floor(options.cliOverride);
  }
  const fromConfig = options.config?.apply?.policyMaxBytes;
  if (fromConfig !== undefined && Number.isFinite(fromConfig) && fromConfig > 0) {
    return Math.floor(fromConfig);
  }
  const mode = options.applyMode ?? options.config?.apply?.mode ?? "heuristic";
  return mode === "hybrid"
    ? DEFAULT_HYBRID_POLICY_MAX_BYTES
    : DEFAULT_HEURISTIC_POLICY_MAX_BYTES;
}

export function parseApplyMode(value: string | undefined): ApplyMode | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "heuristic" || normalized === "hybrid") {
    return normalized;
  }
  return undefined;
}

export function isTokenForgeConfig(value: unknown): value is TokenForgeConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return true;
}
