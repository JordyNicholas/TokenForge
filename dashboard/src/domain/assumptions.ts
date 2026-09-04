/** Vendor-neutral cost knobs. Not a billing API. */
export type Assumptions = {
  usdPerMillionTokens: number;
  teamSize: number;
  msgsPerDevPerDay: number;
  daysPerMonth: number;
  tokensPerMessage: number;
  /** 0–1 share of traffic on a higher-cost model. */
  premiumShare: number;
  /** Premium model costs this × the base rate. */
  premiumMultiplier: number;
  /**
   * 0–1 share of billed Chat/Agent usage this waste class applies to.
   * 1 = the scan’s exclusion ratio; 0.3 ≈ pitch 30% on a 99.8% fixture.
   */
  realizedWasteShare: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  usdPerMillionTokens: 15,
  teamSize: 40,
  msgsPerDevPerDay: 25,
  daysPerMonth: 21,
  tokensPerMessage: 12_000,
  premiumShare: 0.2,
  premiumMultiplier: 4,
  realizedWasteShare: 1,
};

/**
 * Waste applicability for the pitch ~30% scenario on a high-exclusion fixture.
 * Displayed savings ≈ scan exclusion × this share.
 */
export const PITCH_REALIZED_WASTE_SHARE = 0.3;

export function withPitchScenario(assumptions: Assumptions): Assumptions {
  return { ...assumptions, realizedWasteShare: PITCH_REALIZED_WASTE_SHARE };
}

/**
 * Editable vendor-plan-shaped starting points — not live billing rates.
 * Managers still tune knobs; presets only seed the calculator.
 */
export type AssumptionPresetId =
  | "neutral"
  | "copilot-business"
  | "cursor-pro"
  | "claude-team";

export type AssumptionPreset = {
  id: AssumptionPresetId;
  label: string;
  hint: string;
  patch: Partial<Assumptions>;
};

export const ASSUMPTION_PRESETS: readonly AssumptionPreset[] = [
  {
    id: "neutral",
    label: "Neutral defaults",
    hint: "Reset to TokenForge calculator defaults.",
    patch: { ...DEFAULT_ASSUMPTIONS },
  },
  {
    id: "copilot-business",
    label: "Copilot Business-shaped",
    hint: "Mid list-price + broader Chat/Agent mix. Not a Microsoft billing API.",
    patch: {
      usdPerMillionTokens: 10,
      premiumShare: 0.15,
      premiumMultiplier: 3,
      tokensPerMessage: 10_000,
      realizedWasteShare: 0.45,
    },
  },
  {
    id: "cursor-pro",
    label: "Cursor Pro-shaped",
    hint: "Higher agent-context assumption. Not Cursor billing.",
    patch: {
      usdPerMillionTokens: 18,
      premiumShare: 0.35,
      premiumMultiplier: 4,
      tokensPerMessage: 16_000,
      realizedWasteShare: 0.4,
    },
  },
  {
    id: "claude-team",
    label: "Claude Team-shaped",
    hint: "Premium-leaning Agent turns. Not Anthropic billing.",
    patch: {
      usdPerMillionTokens: 15,
      premiumShare: 0.45,
      premiumMultiplier: 5,
      tokensPerMessage: 14_000,
      realizedWasteShare: 0.35,
    },
  },
];

export function applyAssumptionPreset(
  current: Assumptions,
  presetId: AssumptionPresetId,
): Assumptions {
  const preset = ASSUMPTION_PRESETS.find((row) => row.id === presetId);
  if (!preset) {
    return current;
  }
  if (preset.id === "neutral") {
    return { ...DEFAULT_ASSUMPTIONS };
  }
  return { ...current, ...preset.patch };
}

/** Immutable snapshot for a compare run (#87) — later knob edits must not rewrite history. */
export function cloneAssumptions(assumptions: Assumptions): Assumptions {
  return { ...assumptions };
}

export function assumptionsEqual(a: Assumptions, b: Assumptions): boolean {
  return (
    a.usdPerMillionTokens === b.usdPerMillionTokens &&
    a.teamSize === b.teamSize &&
    a.msgsPerDevPerDay === b.msgsPerDevPerDay &&
    a.daysPerMonth === b.daysPerMonth &&
    a.tokensPerMessage === b.tokensPerMessage &&
    a.premiumShare === b.premiumShare &&
    a.premiumMultiplier === b.premiumMultiplier &&
    a.realizedWasteShare === b.realizedWasteShare
  );
}

export function summarizeAssumptionsFreeze(assumptions: Assumptions): string {
  const wastePct = Math.round(assumptions.realizedWasteShare * 100);
  const premiumPct = Math.round(assumptions.premiumShare * 100);
  return `${assumptions.teamSize} devs · $${assumptions.usdPerMillionTokens}/M · waste ${wastePct}% · premium ${premiumPct}%`;
}
