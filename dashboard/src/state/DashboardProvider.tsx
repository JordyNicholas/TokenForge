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
  cloneAssumptions,
  isDemoSourceLabel,
  parseUsageFile,
  parseUsageText,
  projectSavings,
  resolveBootAfterUsageUrl,
  listUsagePeriods,
  normalizeUsagePeriodPair,
  upsertUsageSnapshot,
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
  /**
   * Assumptions frozen with the active compare run (#87).
   * Variance estimate $ uses this snapshot, not live knobs.
   */
  compareAssumptionsFreeze: Assumptions | null;
  freezeCompareAssumptions: () => void;
  /** Period-scoped usage snapshots for variance board (#93). */
  usagePeriods: string[];
  baselinePeriod: string | null;
  afterPeriod: string | null;
  setBaselinePeriod: (period: string) => void;
  setAfterPeriod: (period: string) => void;
  compareBaselineUsage: UsageMetrics | null;
  compareAfterUsage: UsageMetrics | null;
  usageSnapshotLabel: (period: string) => string | null;
  /** True when baseline/after picks were swapped to chronological order. */
  usagePeriodsAutoCorrected: boolean;
  dismissUsagePeriodAutoCorrected: () => void;
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
  const assumptionsRef = useRef(assumptions);
  assumptionsRef.current = assumptions;
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
  const [compareAssumptionsFreeze, setCompareAssumptionsFreeze] =
    useState<Assumptions | null>(null);
  const [usageSnapshots, setUsageSnapshots] = useState<Record<string, UsageMetrics>>({});
  const [usageSnapshotLabels, setUsageSnapshotLabels] = useState<Record<string, string>>({});
  const [baselinePeriod, setBaselinePeriodState] = useState<string | null>(null);
  const [afterPeriod, setAfterPeriodState] = useState<string | null>(null);
  const [usagePeriodsAutoCorrected, setUsagePeriodsAutoCorrected] = useState(false);
  const baselinePeriodRef = useRef<string | null>(null);
  const afterPeriodRef = useRef<string | null>(null);
  baselinePeriodRef.current = baselinePeriod;
  afterPeriodRef.current = afterPeriod;
  const skipCompareClearOnMount = useRef(true);

  const applyPeriodPair = useCallback((baseline: string | null, after: string | null) => {
    const normalized = normalizeUsagePeriodPair(baseline, after);
    setBaselinePeriodState(normalized.baselinePeriod);
    setAfterPeriodState(normalized.afterPeriod);
    setUsagePeriodsAutoCorrected(normalized.inverted);
  }, []);

  const dismissUsagePeriodAutoCorrected = useCallback(() => {
    setUsagePeriodsAutoCorrected(false);
  }, []);

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

  const freezeCompareAssumptions = useCallback(() => {
    setCompareAssumptionsFreeze(cloneAssumptions(assumptionsRef.current));
  }, []);

  const beginAfterUsageCompare = useCallback(
    (usage: UsageMetrics, label: string) => {
      setAfterUsage(usage);
      setAfterUsageLabel(label);
      setAfterUsageError(null);
      setCompareAssumptionsFreeze(cloneAssumptions(assumptionsRef.current));
      setUsageSnapshots((current) => upsertUsageSnapshot(current, usage));
      setUsageSnapshotLabels((current) => ({ ...current, [usage.period]: label }));
      const baseline =
        baselinePeriodRef.current ?? loaded.seed?.usage?.period ?? null;
      applyPeriodPair(baseline, usage.period);
    },
    [applyPeriodPair, loaded.seed?.usage?.period],
  );

  const setBaselinePeriod = useCallback(
    (period: string) => {
      applyPeriodPair(period, afterPeriodRef.current);
    },
    [applyPeriodPair],
  );

  const setAfterPeriod = useCallback(
    (period: string) => {
      applyPeriodPair(baselinePeriodRef.current, period);
    },
    [applyPeriodPair],
  );

  useEffect(() => {
    const usage = loaded.seed?.usage;
    if (!usage) {
      return;
    }
    setUsageSnapshots((current) => upsertUsageSnapshot(current, usage));
    setUsageSnapshotLabels((current) => ({
      ...current,
      [usage.period]: loaded.usageLabel ?? usage.period,
    }));
    setBaselinePeriodState(usage.period);
  }, [loaded.seed?.usage, loaded.usageLabel]);

  const usagePeriods = useMemo(
    () => listUsagePeriods(usageSnapshots),
    [usageSnapshots],
  );

  const effectivePeriods = useMemo(
    () => normalizeUsagePeriodPair(baselinePeriod, afterPeriod),
    [baselinePeriod, afterPeriod],
  );

  const compareBaselineUsage = useMemo(() => {
    const period = effectivePeriods.baselinePeriod;
    if (period && usageSnapshots[period]) {
      return usageSnapshots[period] ?? null;
    }
    return loaded.seed?.usage ?? null;
  }, [effectivePeriods.baselinePeriod, usageSnapshots, loaded.seed?.usage]);

  const compareAfterUsage = useMemo(() => {
    const period = effectivePeriods.afterPeriod;
    if (period && usageSnapshots[period]) {
      return usageSnapshots[period] ?? null;
    }
    return afterUsage;
  }, [effectivePeriods.afterPeriod, usageSnapshots, afterUsage]);

  const usageSnapshotLabel = useCallback(
    (period: string) => usageSnapshotLabels[period] ?? null,
    [usageSnapshotLabels],
  );

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
    setAfterPeriodState((currentAfter) => {
      if (currentAfter) {
        setUsageSnapshots((snapshots) => {
          if (Object.keys(snapshots).length <= 1) {
            return snapshots;
          }
          const next = { ...snapshots };
          delete next[currentAfter];
          return next;
        });
        setUsageSnapshotLabels((labels) => {
          const next = { ...labels };
          delete next[currentAfter];
          return next;
        });
      }
      return null;
    });
    setAfterUsage(null);
    setAfterUsageLabel(null);
    setAfterUsageError(null);
    setCompareAssumptionsFreeze(null);
  }, []);

  const loadAfterFixFile = useCallback(
    async (file: File) => {
      const { parseDashboardFile } = await import("../data/loadDocument");
      const next = await parseDashboardFile(file);
      setAfterFixSeed(next);
      setAfterFixLabel(file.name);
      if (next.usage) {
        beginAfterUsageCompare(next.usage, `${file.name} · usage`);
      }
    },
    [beginAfterUsageCompare],
  );

  const loadAfterUsageFromFile = useCallback(
    async (file: File) => {
      try {
        beginAfterUsageCompare(await parseUsageFile(file), file.name);
      } catch (error) {
        setAfterUsageError(error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
    [beginAfterUsageCompare],
  );

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
    setCompareAssumptionsFreeze(null);
    setAfterPeriodState(null);
    setUsagePeriodsAutoCorrected(false);
    if (loaded.seed?.usage) {
      const usage = loaded.seed.usage;
      setUsageSnapshots({ [usage.period]: usage });
      setUsageSnapshotLabels({
        [usage.period]: loaded.usageLabel ?? usage.period,
      });
      setBaselinePeriodState(usage.period);
    } else {
      setUsageSnapshots({});
      setUsageSnapshotLabels({});
      setBaselinePeriodState(null);
    }
  }, [loaded.sourceLabel, loaded.seed?.usage, loaded.usageLabel]);

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
        beginAfterUsageCompare(usage, bootAfter);
      } catch (error) {
        if (!cancelled) {
          setAfterUsageError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [beginAfterUsageCompare]);

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
      compareAssumptionsFreeze,
      freezeCompareAssumptions,
      usagePeriods,
      baselinePeriod,
      afterPeriod,
      setBaselinePeriod,
      setAfterPeriod,
      compareBaselineUsage,
      compareAfterUsage,
      usageSnapshotLabel,
      usagePeriodsAutoCorrected,
      dismissUsagePeriodAutoCorrected,
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
      compareAssumptionsFreeze,
      freezeCompareAssumptions,
      usagePeriods,
      baselinePeriod,
      afterPeriod,
      setBaselinePeriod,
      setAfterPeriod,
      compareBaselineUsage,
      compareAfterUsage,
      usageSnapshotLabel,
      usagePeriodsAutoCorrected,
      dismissUsagePeriodAutoCorrected,
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
