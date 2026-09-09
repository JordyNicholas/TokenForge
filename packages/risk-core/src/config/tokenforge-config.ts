import {
  DEFAULT_HEURISTIC_POLICY_MAX_BYTES,
  DEFAULT_HYBRID_POLICY_MAX_BYTES,
} from "../domain/constants";

export type ApplyMode = "heuristic" | "hybrid";

export type EnrichmentTierSetting = "auto" | "local" | "vendor";

/**
 * How much of the reasoning pack a run writes.
 *
 * The default is `roles` rather than `roles+persona` because the two halves
 * carry different risk. A directory table is behavioural routing; a persona is
 * voice, and a repo that already opens its instructions with one gets two
 * competing framings plus the impression that TokenForge overwrote the author.
 * The safe half ships by default; the other one is asked for.
 */
export type ReasoningPackMode = "off" | "roles" | "roles+persona";

/** Reasoning-pack modes, in the order a chooser should show them. */
export const REASONING_PACK_MODES = ["off", "roles", "roles+persona"] as const;

/** Emitted when neither a flag nor config says otherwise. */
export const DEFAULT_REASONING_PACK_MODE: ReasoningPackMode = "roles";

export type TokenForgeConfig = {
  scan?: {
    enrichmentTier?: EnrichmentTierSetting;
    localMaxCandidates?: number;
  };
  apply?: {
    mode?: ApplyMode;
    policyMaxBytes?: number;
    reasoningPack?: ReasoningPackMode;
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

export type ResolveReasoningPackModeOptions = {
  config?: TokenForgeConfig;
  cliOverride?: ReasoningPackMode;
};

/**
 * Reasoning-pack mode, flag over config over default.
 *
 * Same precedence as {@link resolvePolicyMaxBytes}, so a run reads the two
 * apply knobs the same way.
 */
export function resolveReasoningPackMode(
  options: ResolveReasoningPackModeOptions = {},
): ReasoningPackMode {
  if (options.cliOverride !== undefined) {
    return options.cliOverride;
  }
  const fromConfig = options.config?.apply?.reasoningPack;
  if (fromConfig !== undefined && isReasoningPackMode(fromConfig)) {
    return fromConfig;
  }
  return DEFAULT_REASONING_PACK_MODE;
}

export function isReasoningPackMode(value: unknown): value is ReasoningPackMode {
  return (
    typeof value === "string" &&
    (REASONING_PACK_MODES as readonly string[]).includes(value)
  );
}

/**
 * Parse a `--reasoning-pack` value.
 *
 * Returns `undefined` for anything unrecognised so the caller can report a
 * usage error rather than silently falling back - a typo that quietly turned
 * the pack off would be indistinguishable from it working.
 */
export function parseReasoningPackMode(
  value: string | undefined,
): ReasoningPackMode | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return isReasoningPackMode(normalized) ? normalized : undefined;
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
