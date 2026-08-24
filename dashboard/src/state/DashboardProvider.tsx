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
  aggregateTotals,
  isDemoSourceLabel,
  projectSavings,
  withPitchScenario,
  type Assumptions,
  type DashboardSeed,
  type Projection,
} from "../domain";
import { useSeedLoader } from "./useSeedLoader";

const REDACT_STORAGE_KEY = "tokenforge-redact-paths";
const DEMO_BANNER_STORAGE_KEY = "tokenforge-dismiss-demo-banner";

export type DashboardState = {
  seed: DashboardSeed | null;
  reports: TokenRiskReport[];
  totals: TokenRiskTotals;
  assumptions: Assumptions;
  projection: Projection;
  sourceLabel: string;
  loadError: string | null;
  isDemoSource: boolean;
  redactPaths: boolean;
  setRedactPaths: (next: boolean) => void;
  demoBannerDismissed: boolean;
  dismissDemoBanner: () => void;
  /** Optional after-Fix report for before/after Prove compare. */
  afterFixSeed: DashboardSeed | null;
  afterFixLabel: string | null;
  afterFixTotals: TokenRiskTotals | null;
  loadAfterFixFile: (file: File) => Promise<void>;
  clearAfterFix: () => void;
  patchAssumptions: (patch: Partial<Assumptions>) => void;
  applyPitchScenario: () => void;
  loadFromFile: (file: File) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
  resetToDemo: () => Promise<void>;
  usageLabel: string | null;
  loadUsageFromFile: (file: File) => Promise<void>;
  resetUsageToDemo: () => Promise<void>;
  clearUsage: () => void;
};

const DashboardContext = createContext<DashboardState | null>(null);

function readBool(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (stored === "1") {
      return true;
    }
    if (stored === "0") {
      return false;
    }
  } catch {
    /* private mode */
  }
  return fallback;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const loaded = useSeedLoader();
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [redactPaths, setRedactPathsState] = useState(() =>
    readBool(REDACT_STORAGE_KEY, false),
  );
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(() =>
    readBool(DEMO_BANNER_STORAGE_KEY, false),
  );
  const [afterFixSeed, setAfterFixSeed] = useState<DashboardSeed | null>(null);
  const [afterFixLabel, setAfterFixLabel] = useState<string | null>(null);

  const projection = useMemo(
    () => projectSavings(loaded.totals, assumptions),
    [loaded.totals, assumptions],
  );

  const afterFixTotals = useMemo(
    () => (afterFixSeed ? aggregateTotals(afterFixSeed.reports) : null),
    [afterFixSeed],
  );

  const patchAssumptions = useCallback((patch: Partial<Assumptions>) => {
    setAssumptions((current) => ({ ...current, ...patch }));
  }, []);

  const applyPitchScenario = useCallback(() => {
    setAssumptions((current) => withPitchScenario(current));
  }, []);

  const setRedactPaths = useCallback((next: boolean) => {
    setRedactPathsState(next);
    try {
      localStorage.setItem(REDACT_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissDemoBanner = useCallback(() => {
    setDemoBannerDismissed(true);
    try {
      localStorage.setItem(DEMO_BANNER_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const clearAfterFix = useCallback(() => {
    setAfterFixSeed(null);
    setAfterFixLabel(null);
  }, []);

  const loadAfterFixFile = useCallback(async (file: File) => {
    const { parseDashboardFile } = await import("../data/loadDocument");
    const next = await parseDashboardFile(file);
    setAfterFixSeed(next);
    setAfterFixLabel(file.name);
  }, []);

  // Clear after-Fix compare when primary seed changes.
  useEffect(() => {
    setAfterFixSeed(null);
    setAfterFixLabel(null);
  }, [loaded.sourceLabel]);

  const isDemoSource = isDemoSourceLabel(loaded.sourceLabel);

  const value = useMemo(
    () => ({
      ...loaded,
      assumptions,
      projection,
      isDemoSource,
      redactPaths,
      setRedactPaths,
      demoBannerDismissed,
      dismissDemoBanner,
      afterFixSeed,
      afterFixLabel,
      afterFixTotals,
      loadAfterFixFile,
      clearAfterFix,
      patchAssumptions,
      applyPitchScenario,
    }),
    [
      loaded,
      assumptions,
      projection,
      isDemoSource,
      redactPaths,
      setRedactPaths,
      demoBannerDismissed,
      dismissDemoBanner,
      afterFixSeed,
      afterFixLabel,
      afterFixTotals,
      loadAfterFixFile,
      clearAfterFix,
      patchAssumptions,
      applyPitchScenario,
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
