import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TokenRiskReport, TokenRiskTotals } from "@tokenforge/risk-core";
import {
  DEFAULT_ASSUMPTIONS,
  projectSavings,
  type Assumptions,
  type Projection,
} from "./calculator";
import {
  DEMO_SEED_URL,
  SeedLoadError,
  aggregateTotals,
  fetchDashboardDocument,
  parseDashboardFile,
  type DashboardSeed,
} from "./seed";

export type DashboardState = {
  seed: DashboardSeed | null;
  reports: TokenRiskReport[];
  totals: TokenRiskTotals;
  assumptions: Assumptions;
  projection: Projection;
  sourceLabel: string;
  loadError: string | null;
  setAssumptions: (next: Assumptions) => void;
  patchAssumptions: (patch: Partial<Assumptions>) => void;
  loadFromFile: (file: File) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
  resetToDemo: () => Promise<void>;
};

const EMPTY_TOTALS: TokenRiskTotals = {
  beforeTokens: 0,
  afterTokens: 0,
  savedTokens: 0,
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState<DashboardSeed | null>(null);
  const [sourceLabel, setSourceLabel] = useState(DEMO_SEED_URL);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);

  const applySeed = useCallback((next: DashboardSeed, label: string) => {
    setSeed(next);
    setSourceLabel(label);
    setLoadError(null);
  }, []);

  const fail = useCallback((error: unknown) => {
    const message =
      error instanceof SeedLoadError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    setLoadError(message);
  }, []);

  const resetToDemo = useCallback(async () => {
    try {
      applySeed(await fetchDashboardDocument(DEMO_SEED_URL), DEMO_SEED_URL);
    } catch (error) {
      fail(error);
    }
  }, [applySeed, fail]);

  useEffect(() => {
    void resetToDemo();
  }, [resetToDemo]);

  const loadFromFile = useCallback(
    async (file: File) => {
      try {
        applySeed(await parseDashboardFile(file), file.name);
      } catch (error) {
        fail(error);
      }
    },
    [applySeed, fail],
  );

  const loadFromUrl = useCallback(
    async (url: string) => {
      try {
        applySeed(await fetchDashboardDocument(url), url);
      } catch (error) {
        fail(error);
      }
    },
    [applySeed, fail],
  );

  const reports = seed?.reports ?? [];
  const totals = seed ? aggregateTotals(reports) : EMPTY_TOTALS;
  const projection = useMemo(
    () => projectSavings(totals, assumptions),
    [totals, assumptions],
  );
  const patchAssumptions = useCallback((patch: Partial<Assumptions>) => {
    setAssumptions((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      seed,
      reports,
      totals,
      assumptions,
      projection,
      sourceLabel,
      loadError,
      setAssumptions,
      patchAssumptions,
      loadFromFile,
      loadFromUrl,
      resetToDemo,
    }),
    [
      seed,
      reports,
      totals,
      assumptions,
      projection,
      sourceLabel,
      loadError,
      patchAssumptions,
      loadFromFile,
      loadFromUrl,
      resetToDemo,
    ],
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
