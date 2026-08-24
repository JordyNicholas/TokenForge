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
