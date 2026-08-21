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
