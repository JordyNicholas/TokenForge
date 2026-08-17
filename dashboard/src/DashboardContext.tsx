import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_ASSUMPTIONS,
  DEMO_TOTALS,
  projectSavings,
  type Assumptions,
  type Projection,
} from "./calculator";
import type { TokenRiskTotals } from "@tokenforge/risk-core";

export type DashboardState = {
  totals: TokenRiskTotals;
  assumptions: Assumptions;
  projection: Projection;
  setAssumptions: (next: Assumptions) => void;
  patchAssumptions: (patch: Partial<Assumptions>) => void;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const totals = DEMO_TOTALS;
  const projection = useMemo(
    () => projectSavings(totals, assumptions),
    [totals, assumptions],
  );
  const patchAssumptions = useCallback((patch: Partial<Assumptions>) => {
    setAssumptions((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      totals,
      assumptions,
      projection,
      setAssumptions,
      patchAssumptions,
    }),
    [totals, assumptions, projection, patchAssumptions],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const value = useContext(DashboardContext);
  if (!value) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return value;
}
