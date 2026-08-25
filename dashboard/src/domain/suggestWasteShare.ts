/**
 * Suggest realizedWasteShare from a variance compare (#97).
 * Estimated $ scales linearly with waste applicability under projectSavings.
 */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function roundShare(value: number): number {
  return Math.round(clamp01(value) * 100) / 100;
}

export type WasteShareSuggestion = {
  suggestedShare: number;
  currentShare: number;
  estimatedUsdReduction: number;
  actualBilledChange: number;
  /** Absolute delta in share points (suggested − current). */
  deltaShare: number;
  rationale: string;
};

/**
 * Calibrate waste applicability so estimated $ would match observed billed Δ.
 * Returns null when the compare cannot support a suggestion (no positive estimate
 * or non-positive actual billed reduction).
 */
export function suggestRealizedWasteShare(input: {
  currentShare: number;
  estimatedUsdReduction: number;
  actualBilledChange: number;
}): WasteShareSuggestion | null {
  const currentShare = clamp01(input.currentShare);
  const { estimatedUsdReduction, actualBilledChange } = input;

  if (!(estimatedUsdReduction > 0) || !(actualBilledChange > 0)) {
    return null;
  }
  if (!(currentShare > 0)) {
    return null;
  }

  const suggestedShare = roundShare(
    currentShare * (actualBilledChange / estimatedUsdReduction),
  );
  const deltaShare = Math.round((suggestedShare - currentShare) * 100) / 100;

  return {
    suggestedShare,
    currentShare,
    estimatedUsdReduction,
    actualBilledChange,
    deltaShare,
    rationale:
      "Scaled waste applicability so estimated $ would match the observed billed reduction for this baseline → after pair. Re-freeze Assumptions after applying.",
  };
}
