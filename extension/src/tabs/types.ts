import { RiskAssessment } from "@tokenforge/risk-core";

export type TabSnapshot = {
  path: string;
  bytes: number;
  lastActivityAt: number; // ms epoch - max(lastFocusAt, lastEditAt)
};

export type TrackedTab = TabSnapshot & {
  /** Editor URI string — TabRegistry map key. */
  uri: string;
  assessment: RiskAssessment;
  lastFocusAt: number;
  lastEditAt: number;
};