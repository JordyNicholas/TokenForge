/**
 * Estimate vs billed calibration bands for Prove (#F24-A).
 * Pure logic — not a causation claim.
 */
import type { CohortTrustLevel } from "./cohortCompare";

export type CalibrationBand = "strong" | "suggestive" | "weak" | "insufficient";

export type CalibrationBandResult = {
  band: CalibrationBand;
  label: string;
  rationale: string;
};

const MIN_USD = 0.005;

function movementAligns(
  estimatedReductionUsd: number,
  actualBilledChangeUsd: number,
): boolean {
  if (estimatedReductionUsd <= MIN_USD || actualBilledChangeUsd <= MIN_USD) {
    return false;
  }
  return actualBilledChangeUsd > 0 && estimatedReductionUsd > 0;
}

/**
 * Map estimated vs billed movement to a calibration band.
 * `strong` only when control cohort exists, cohort trust is strong, and movement aligns.
 */
export function estimateVsBilledBand(input: {
  estimatedReductionUsd: number;
  actualBilledChangeUsd: number;
  hasControlCohort: boolean;
  trustLevel: CohortTrustLevel;
}): CalibrationBandResult {
  const { estimatedReductionUsd, actualBilledChangeUsd, hasControlCohort, trustLevel } =
    input;
  const aligns = movementAligns(estimatedReductionUsd, actualBilledChangeUsd);
  const varianceUsd = actualBilledChangeUsd - estimatedReductionUsd;
  const hasEstimate = estimatedReductionUsd > MIN_USD;
  const hasActual = Math.abs(actualBilledChangeUsd) > MIN_USD;

  if (trustLevel === "none" || (!hasEstimate && !hasActual)) {
    return {
      band: "insufficient",
      label: "Insufficient evidence",
      rationale:
        "Load Fix markers, baseline + after billed usage, and a frozen Assumptions snapshot before treating estimate vs bill as calibrated.",
    };
  }

  if (
    hasControlCohort &&
    trustLevel === "strong" &&
    aligns &&
    actualBilledChangeUsd >= estimatedReductionUsd * 0.25
  ) {
    return {
      band: "strong",
      label: "Strong calibration (cohort-backed)",
      rationale: `Fix-on vs control cohort trust is strong; billed Δ (${formatSignedUsd(actualBilledChangeUsd)}) aligns with frozen estimate (${formatUsd(estimatedReductionUsd)}). Still not 100% invoice causation.`,
    };
  }

  if (trustLevel === "weak" || !hasControlCohort) {
    return {
      band: "weak",
      label: "Weak calibration (no control)",
      rationale: hasControlCohort
        ? "Cohort trust is weak — relative Fix-on vs control billed Δ is not available or not reliable."
        : "No control cohort — Fix-on billed movement alone cannot support strong calibration.",
    };
  }

  if (!aligns) {
    return {
      band: "weak",
      label: "Weak calibration (misaligned)",
      rationale: `Estimated reduction (${formatUsd(estimatedReductionUsd)}) and actual billed Δ (${formatSignedUsd(actualBilledChangeUsd)}) do not move in the same direction — check periods, adoption, and Assumptions freeze.`,
    };
  }

  return {
    band: "suggestive",
    label: "Suggestive calibration",
    rationale: `Movement aligns (estimate ${formatUsd(estimatedReductionUsd)}, actual ${formatSignedUsd(actualBilledChangeUsd)}, variance ${formatSignedUsd(varianceUsd)}). Cohort or magnitude limits prevent a strong band — not proof TokenForge caused the invoice delta.`,
  };
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const rounded = abs >= 100 ? abs.toFixed(0) : abs.toFixed(2);
  return `$${rounded}`;
}

function formatSignedUsd(value: number): string {
  const abs = Math.abs(value);
  const rounded = abs >= 100 ? abs.toFixed(0) : abs.toFixed(2);
  return `${value >= 0 ? "+" : "−"}$${rounded}`;
}
