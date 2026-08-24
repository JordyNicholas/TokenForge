import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TokenRiskReport, TokenRiskTotals } from "@tokenforge/risk-core";
import {
  DEFAULT_ASSUMPTIONS,
  aggregateTotals,
  isDemoSourceLabel,
  parseUsageFile,
  parseUsageText,
  projectSavings,
  resolveBootAfterUsageUrl,
  withPitchScenario,
  type Assumptions,
  type DashboardSeed,
  type Projection,
  type UsageMetrics,
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
  /** After-period billed usage for baseline → after variance (#86). */
  afterUsage: UsageMetrics | null;
  afterUsageLabel: string | null;
  loadAfterUsageFromFile: (file: File) => Promise<void>;
  clearAfterUsage: () => void;
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
  const [afterUsage, setAfterUsage] = useState<UsageMetrics | null>(null);
  const [afterUsageLabel, setAfterUsageLabel] = useState<string | null>(null);
  const [afterUsageError, setAfterUsageError] = useState<string | null>(null);
  const skipCompareClearOnMount = useRef(true);

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

  const clearAfterUsage = useCallback(() => {
    setAfterUsage(null);
    setAfterUsageLabel(null);
    setAfterUsageError(null);
  }, []);

  const loadAfterFixFile = useCallback(async (file: File) => {
    const { parseDashboardFile } = await import("../data/loadDocument");
    const next = await parseDashboardFile(file);
    setAfterFixSeed(next);
    setAfterFixLabel(file.name);
    if (next.usage) {
      setAfterUsage(next.usage);
      setAfterUsageLabel(`${file.name} · usage`);
      setAfterUsageError(null);
    }
  }, []);

  const loadAfterUsageFromFile = useCallback(async (file: File) => {
    try {
      const usage = await parseUsageFile(file);
      setAfterUsage(usage);
      setAfterUsageLabel(file.name);
      setAfterUsageError(null);
    } catch (error) {
      setAfterUsageError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, []);

  // Clear after-Fix / after-usage compare when primary seed changes (not on first mount,
  // so `?afterUsage=` can land alongside the demo/boot seed).
  useEffect(() => {
    if (skipCompareClearOnMount.current) {
      skipCompareClearOnMount.current = false;
      return;
    }
    setAfterFixSeed(null);
    setAfterFixLabel(null);
    setAfterUsage(null);
    setAfterUsageLabel(null);
    setAfterUsageError(null);
  }, [loaded.sourceLabel]);

  // Optional `?afterUsage=/sample-usage-after.csv` for demo / Prove handoff.
  useEffect(() => {
    const bootAfter = resolveBootAfterUsageUrl();
    if (!bootAfter) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(bootAfter);
        if (!response.ok) {
          throw new Error(`Could not fetch ${bootAfter} (${response.status})`);
        }
        const usage = parseUsageText(await response.text(), bootAfter);
        if (cancelled) {
          return;
        }
        setAfterUsage(usage);
        setAfterUsageLabel(bootAfter);
        setAfterUsageError(null);
      } catch (error) {
        if (!cancelled) {
          setAfterUsageError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isDemoSource = isDemoSourceLabel(loaded.sourceLabel);
  const loadError = loaded.loadError ?? afterUsageError;

  const value = useMemo(
    () => ({
      ...loaded,
      loadError,
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
      afterUsage,
      afterUsageLabel,
      loadAfterUsageFromFile,
      clearAfterUsage,
    }),
    [
      loaded,
      loadError,
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
      afterUsage,
      afterUsageLabel,
      loadAfterUsageFromFile,
      clearAfterUsage,
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
