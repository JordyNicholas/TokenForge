import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TokenRiskReport, TokenRiskTotals } from "@tokenforge/risk-core";
import {
  DEFAULT_ASSUMPTIONS,
  projectSavings,
  type Assumptions,
  type DashboardSeed,
  type Projection,
} from "../domain";
import { useSeedLoader } from "./useSeedLoader";

export type DashboardState = {
  seed: DashboardSeed | null;
  reports: TokenRiskReport[];
  totals: TokenRiskTotals;
  assumptions: Assumptions;
  projection: Projection;
  sourceLabel: string;
  loadError: string | null;
  patchAssumptions: (patch: Partial<Assumptions>) => void;
  loadFromFile: (file: File) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
  resetToDemo: () => Promise<void>;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const loaded = useSeedLoader();
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const projection = useMemo(
    () => projectSavings(loaded.totals, assumptions),
    [loaded.totals, assumptions],
  );
  const patchAssumptions = useCallback((patch: Partial<Assumptions>) => {
    setAssumptions((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      ...loaded,
      assumptions,
      projection,
      patchAssumptions,
    }),
    [loaded, assumptions, projection, patchAssumptions],
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
