/**
 * Honest savings tiers for Prove (#173) — aligned with PITCH_FAQ (#98).
 * Each tier measures a different signal; upper tiers do not imply causation (#96).
 */
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import { formatPercent, formatTokens, formatUsd } from "./format";
import { projectSavings, tokenSavedPercent, type Projection } from "./calculator";
import { usageForTeam, type UsageMetrics } from "./usage";
import type { UsagePeriodCompare } from "./usageCompare";

export type SavingsTierId =
  | "live-hygiene"
  | "scan-delta"
  | "projected-usd"
  | "imported-bill";

export type SavingsTierDefinition = {
  id: SavingsTierId;
  order: number;
  label: string;
  shortHonesty: string;
};

export const TIER_UNAVAILABLE = "Not available";

/** Ordered low → high; higher tiers dilute / do not stack as one causal savings number. */
export const SAVINGS_TIERS: readonly SavingsTierDefinition[] = [
  {
    id: "live-hygiene",
    order: 1,
    label: "Live hygiene",
    shortHonesty:
      "Extension Filter estimate from open tabs this IDE window. Hygiene advice only — not agent interception.",
  },
  {
    id: "scan-delta",
    order: 2,
    label: "Repo scan delta",
    shortHonesty:
      "Before/after token totals from a repo scan or apply — local context policy, not billed usage.",
  },
  {
    id: "projected-usd",
    order: 3,
    label: "Projected $",
    shortHonesty:
      "Scan exclusion % × Assumptions (rate, team size, msgs/day). Scenario math — not a production SLA.",
  },
  {
    id: "imported-bill",
    order: 4,
    label: "Imported bill",
    shortHonesty:
      "Period billed usage from FinOps import or sync. Reconciles estimate vs actual — not pipeline metering.",
  },
] as const;

export const SAVINGS_TIERS_DILUTION_NOTE =
  "Tiers measure different signals. Billed usage (tier 4) does not prove TokenForge caused an invoice delta without cohort controls.";

export type TierDisplayValue = {
  value: string;
  hint?: string;
  available: boolean;
};

export function tierValueLiveHygiene(): TierDisplayValue {
  return {
    value: TIER_UNAVAILABLE,
    hint: "Context Guard extension · Filter tabs",
    available: false,
  };
}

export function tierValueScanDelta(
  totals: TokenRiskTotals | null | undefined,
  hasScan: boolean,
): TierDisplayValue {
  if (!hasScan || !totals) {
    return {
      value: TIER_UNAVAILABLE,
      hint: "Load a scan report",
      available: false,
    };
  }
  return {
    value: formatTokens(totals.savedTokens),
    hint: `${formatPercent(tokenSavedPercent(totals))} exclusion`,
    available: true,
  };
}

export function tierValueProjectedUsd(
  projection: Projection | null | undefined,
  hasScan: boolean,
): TierDisplayValue {
  if (!hasScan || !projection) {
    return {
      value: TIER_UNAVAILABLE,
      hint: "Requires scan + Assumptions",
      available: false,
    };
  }
  return {
    value: `${formatUsd(projection.monthlyUsdSaved)}/mo`,
    hint: `${formatPercent(projection.scenarioSavedPercent)} scenario`,
    available: true,
  };
}

function signedUsd(value: number): string {
  return `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;
}

export function tierValueImportedBill(input: {
  compare: UsagePeriodCompare | null;
  usage: UsageMetrics | null | undefined;
  teamId: string | null;
}): TierDisplayValue {
  if (input.compare) {
    return {
      value: signedUsd(input.compare.actualBilledChange),
      hint: `Variance ${signedUsd(input.compare.varianceUsd)} · ${input.compare.baseline.period} → ${input.compare.after.period}`,
      available: true,
    };
  }

  if (input.usage) {
    const slice = usageForTeam(input.usage, input.teamId);
    if (slice) {
      return {
        value: formatUsd(slice.estimatedUsd),
        hint: `${input.usage.period} · ${input.usage.providerLabel} · ${input.usage.source}`,
        available: true,
      };
    }
  }

  return {
    value: TIER_UNAVAILABLE,
    hint: "Import baseline + after usage",
    available: false,
  };
}

/** Build all four tier display values for the Overview rail. */
export function buildSavingsTierValues(input: {
  hasScan: boolean;
  totals: TokenRiskTotals | null | undefined;
  assumptions: Parameters<typeof projectSavings>[1];
  compare: UsagePeriodCompare | null;
  usage: UsageMetrics | null | undefined;
  teamId: string | null;
}): Record<SavingsTierId, TierDisplayValue> {
  const projection =
    input.hasScan && input.totals
      ? projectSavings(input.totals, input.assumptions)
      : null;

  return {
    "live-hygiene": tierValueLiveHygiene(),
    "scan-delta": tierValueScanDelta(input.totals, input.hasScan),
    "projected-usd": tierValueProjectedUsd(projection, input.hasScan),
    "imported-bill": tierValueImportedBill({
      compare: input.compare,
      usage: input.usage,
      teamId: input.teamId,
    }),
  };
}
