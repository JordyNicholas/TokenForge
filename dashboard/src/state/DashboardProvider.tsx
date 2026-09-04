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
  fixOnTeamsFromMarkers,
  isDemoSourceLabel,
  parseChangeMarkersFile,
  parseChangeMarkersJson,
  mergeChangeMarkers,
  parseDiscoverLatestFile,
  parseDiscoverLatestJson,
  parseProvePackJson,
  parseSessionStatsFile,
  parseUsageFile,
  parseUsageText,
  projectSavings,
  remapUsageTeams,
  parseUsageTeamMapFile,
  resolveBootAfterUsageUrl,
  resolveBootMarkersUrl,
  resolveBootSessionUrl,
  resolveBootDiscoverUrl,
  resolveBootPackUrl,
  discoverSummaryToLatest,
  sessionStatsFromEntry,
  listUsagePeriods,
  normalizeUsagePeriodPair,
  upsertUsageSnapshot,
  bindPeriodsAroundMarkers,
  withPitchScenario,
  applyAssumptionPreset,
  parseSessionStatsJson,
  saveProveSession,
  loadProveSessionSnapshot,
  hasStoredProveSession,
  shouldAutoRestoreProveSession,
  type AssumptionPresetId,
  type Assumptions,
  type DashboardSeed,
  type DiscoverLatestSummary,
  type DiscoverEntry,
  type ProvePackCoverage,
  type SessionStatsEntry,
  type ProvePackDocument,
  type Projection,
  type UsageMetrics,
} from "../domain";
import type { ProveChangeMarker, SessionStatsReport } from "@tokenforge/risk-core";
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
  loadFromFiles: (files: File[]) => Promise<void>;
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
  applyAssumptionPresetId: (presetId: AssumptionPresetId) => void;
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
  /** True when markers + usage exist but auto period-bind could not bracket. */
  periodBindUnbound: boolean;
  dismissPeriodBindUnbound: () => void;
  /** Prove change markers for Fix-on vs control cohort (#96). */
  changeMarkers: ProveChangeMarker[];
  changeMarkersLabel: string | null;
  fixOnTeams: string[];
  loadChangeMarkersFromFile: (file: File) => Promise<void>;
  loadDemoChangeMarkers: () => Promise<void>;
  clearChangeMarkers: () => void;
  /** Extension session-stats.json for Live hygiene (#157 / F19). */
  sessionStats: SessionStatsReport | null;
  sessionStatsLabel: string | null;
  loadSessionStatsFromFile: (file: File) => Promise<void>;
  clearSessionStats: () => void;
  /** CLI/extension discover-latest.json → policy_gap Investigate. */
  discoverLatest: DiscoverLatestSummary | null;
  discoverLatestLabel: string | null;
  loadDiscoverLatestFromFile: (file: File) => Promise<void>;
  clearDiscoverLatest: () => void;
  /** Multi-team session stats from org prove-pack (#F25). */
  sessionStatsEntries: SessionStatsEntry[];
  /** Multi-team discover summaries from org prove-pack (#F25). */
  discoverEntries: DiscoverEntry[];
  provePackCoverage: ProvePackCoverage | null;
  provePackLabel: string | null;
  loadProvePackFromFile: (file: File) => Promise<void>;
  clearProvePack: () => void;
  /** Vendor label → TF team id map for billed usage reconcile (#F25-E). */
  usageTeamMap: Record<string, string> | null;
  usageTeamMapLabel: string | null;
  loadUsageTeamMapFromFile: (file: File) => Promise<void>;
  clearUsageTeamMap: () => void;
  /** True when a prior Prove session snapshot exists in localStorage. */
  hasStoredProveSession: boolean;
  restoreLastProveSession: () => void;
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
  const [usageTeamMap, setUsageTeamMap] = useState<Record<string, string> | null>(null);
  const [usageTeamMapLabel, setUsageTeamMapLabel] = useState<string | null>(null);
  const remapUsageIfMapped = useCallback(
    (usage: UsageMetrics) =>
      usageTeamMap && Object.keys(usageTeamMap).length > 0
        ? remapUsageTeams(usage, usageTeamMap)
        : usage,
    [usageTeamMap],
  );
  const loaded = useSeedLoader({ remapUsage: remapUsageIfMapped });
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
  const [periodBindUnbound, setPeriodBindUnbound] = useState(false);
  const [changeMarkers, setChangeMarkers] = useState<ProveChangeMarker[]>([]);
  const [changeMarkersLabel, setChangeMarkersLabel] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStatsReport | null>(null);
  const [sessionStatsLabel, setSessionStatsLabel] = useState<string | null>(null);
  const [discoverLatest, setDiscoverLatest] = useState<DiscoverLatestSummary | null>(null);
  const [discoverLatestLabel, setDiscoverLatestLabel] = useState<string | null>(null);
  const [sessionStatsEntries, setSessionStatsEntries] = useState<SessionStatsEntry[]>([]);
  const [discoverEntries, setDiscoverEntries] = useState<DiscoverEntry[]>([]);
  const [provePackCoverage, setProvePackCoverage] = useState<ProvePackCoverage | null>(null);
  const [provePackLabel, setProvePackLabel] = useState<string | null>(null);
  const [lastProvePackJsonText, setLastProvePackJsonText] = useState<string | null>(null);
  const [storedProveSessionAvailable, setStoredProveSessionAvailable] = useState(() =>
    hasStoredProveSession(),
  );
  const baselinePeriodRef = useRef<string | null>(null);
  const afterPeriodRef = useRef<string | null>(null);
  baselinePeriodRef.current = baselinePeriod;
  afterPeriodRef.current = afterPeriod;
  const skipCompareClearOnMount = useRef(true);

  const fixOnTeams = useMemo(
    () => fixOnTeamsFromMarkers(changeMarkers),
    [changeMarkers],
  );

  const applyPeriodPair = useCallback((baseline: string | null, after: string | null) => {
    const normalized = normalizeUsagePeriodPair(baseline, after);
    setBaselinePeriodState(normalized.baselinePeriod);
    setAfterPeriodState(normalized.afterPeriod);
    setUsagePeriodsAutoCorrected(normalized.inverted);
  }, []);

  const dismissUsagePeriodAutoCorrected = useCallback(() => {
    setUsagePeriodsAutoCorrected(false);
  }, []);

  const dismissPeriodBindUnbound = useCallback(() => {
    setPeriodBindUnbound(false);
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

  const applyAssumptionPresetId = useCallback((presetId: AssumptionPresetId) => {
    setAssumptions((current) => applyAssumptionPreset(current, presetId));
  }, []);

  const freezeCompareAssumptions = useCallback(() => {
    setCompareAssumptionsFreeze(cloneAssumptions(assumptionsRef.current));
  }, []);

  const beginAfterUsageCompare = useCallback(
    (usage: UsageMetrics, label: string) => {
      const remapped = remapUsageIfMapped(usage);
      setAfterUsage(remapped);
      setAfterUsageLabel(label);
      setAfterUsageError(null);
      setCompareAssumptionsFreeze(cloneAssumptions(assumptionsRef.current));
      setUsageSnapshots((current) => upsertUsageSnapshot(current, remapped));
      setUsageSnapshotLabels((current) => ({ ...current, [remapped.period]: label }));
      const baseline =
        baselinePeriodRef.current ?? loaded.seed?.usage?.period ?? null;
      applyPeriodPair(baseline, remapped.period);
    },
    [applyPeriodPair, loaded.seed?.usage?.period, remapUsageIfMapped],
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

  const loadChangeMarkersFromFile = useCallback(async (file: File) => {
    const markers = await parseChangeMarkersFile(file);
    setChangeMarkers((current) => mergeChangeMarkers(current, markers));
    setChangeMarkersLabel(file.name);
  }, []);

  const applyProvePackState = useCallback(
    (pack: ProvePackDocument, label: string) => {
      loaded.applySeedDocument(pack.seed, label);
      setChangeMarkers(pack.markers);
      setChangeMarkersLabel(label);
      setSessionStatsEntries(pack.sessions);
      setDiscoverEntries(pack.discovers);
      setProvePackCoverage(pack.coverage ?? null);
      setProvePackLabel(label);

      if (pack.sessions.length === 1) {
        const entry = pack.sessions[0]!;
        setSessionStats(sessionStatsFromEntry(entry));
        setSessionStatsLabel(entry.label);
      } else {
        setSessionStats(null);
        setSessionStatsLabel(
          pack.sessions.length > 0 ? `${pack.sessions.length} teams · prove pack` : null,
        );
      }

      if (pack.discovers.length === 1) {
        const entry = pack.discovers[0]!;
        setDiscoverLatest(discoverSummaryToLatest(entry.summary));
        setDiscoverLatestLabel(entry.label);
      } else {
        setDiscoverLatest(null);
        setDiscoverLatestLabel(
          pack.discovers.length > 0 ? `${pack.discovers.length} teams · prove pack` : null,
        );
      }
    },
    [loaded],
  );

  const loadProvePackFromFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      applyProvePackState(parseProvePackJson(text), file.name);
      setLastProvePackJsonText(text);
    },
    [applyProvePackState],
  );

  const clearProvePack = useCallback(() => {
    setSessionStatsEntries([]);
    setDiscoverEntries([]);
    setProvePackCoverage(null);
    setProvePackLabel(null);
    setLastProvePackJsonText(null);
  }, []);

  const loadUsageTeamMapFromFile = useCallback(async (file: File) => {
    setUsageTeamMap(await parseUsageTeamMapFile(file));
    setUsageTeamMapLabel(file.name);
  }, []);

  const clearUsageTeamMap = useCallback(() => {
    setUsageTeamMap(null);
    setUsageTeamMapLabel(null);
  }, []);

  // Re-apply team map when it changes (baseline, after, period snapshots).
  useEffect(() => {
    if (!usageTeamMap || Object.keys(usageTeamMap).length === 0) {
      return;
    }
    if (loaded.seed?.usage) {
      loaded.applySeedDocument(
        { ...loaded.seed, usage: remapUsageTeams(loaded.seed.usage, usageTeamMap) },
        loaded.sourceLabel,
        "keep",
      );
    }
    setAfterUsage((current) => (current ? remapUsageTeams(current, usageTeamMap) : current));
    setUsageSnapshots((current) => {
      const next: Record<string, UsageMetrics> = {};
      for (const [period, usage] of Object.entries(current)) {
        next[period] = remapUsageTeams(usage, usageTeamMap);
      }
      return next;
    });
  }, [usageTeamMap, loaded.applySeedDocument, loaded.seed, loaded.sourceLabel]);

  const applyProveSessionSnapshot = useCallback(
    (snapshot: ReturnType<typeof loadProveSessionSnapshot>) => {
      if (!snapshot) {
        return;
      }
      if (snapshot.packJsonText) {
        applyProvePackState(parseProvePackJson(snapshot.packJsonText), snapshot.sourceLabel);
        setLastProvePackJsonText(snapshot.packJsonText);
      } else if (snapshot.seed) {
        loaded.applySeedDocument(snapshot.seed, snapshot.sourceLabel);
        setChangeMarkers(snapshot.markers);
        setChangeMarkersLabel(snapshot.changeMarkersLabel);
        setSessionStatsEntries(snapshot.sessionStatsEntries);
        setDiscoverEntries(snapshot.discoverEntries);
        setProvePackCoverage(snapshot.coverage);
        setProvePackLabel(snapshot.provePackLabel);
        setLastProvePackJsonText(null);

        if (snapshot.sessionStatsEntries.length === 1) {
          const entry = snapshot.sessionStatsEntries[0]!;
          setSessionStats(sessionStatsFromEntry(entry));
          setSessionStatsLabel(entry.label);
        } else {
          setSessionStats(null);
          setSessionStatsLabel(snapshot.sessionStatsLabel);
        }

        if (snapshot.discoverEntries.length === 1) {
          const entry = snapshot.discoverEntries[0]!;
          setDiscoverLatest(discoverSummaryToLatest(entry.summary));
          setDiscoverLatestLabel(entry.label);
        } else {
          setDiscoverLatest(null);
          setDiscoverLatestLabel(snapshot.discoverLatestLabel);
        }
      }

      if (snapshot.usageSnapshots) {
        setUsageSnapshots(snapshot.usageSnapshots);
      }
      if (snapshot.usageSnapshotLabels) {
        setUsageSnapshotLabels(snapshot.usageSnapshotLabels);
      }
      if (snapshot.baselinePeriod !== undefined || snapshot.afterPeriod !== undefined) {
        applyPeriodPair(snapshot.baselinePeriod ?? null, snapshot.afterPeriod ?? null);
      }
    },
    [applyProvePackState, applyPeriodPair, loaded],
  );

  const restoreLastProveSession = useCallback(() => {
    applyProveSessionSnapshot(loadProveSessionSnapshot());
  }, [applyProveSessionSnapshot]);

  const loadDemoChangeMarkers = useCallback(async () => {
    const response = await fetch("/sample-change-markers.json");
    if (!response.ok) {
      throw new Error(`Could not fetch sample change markers (${response.status})`);
    }
    const markers = parseChangeMarkersJson(await response.text());
    setChangeMarkers(markers);
    setChangeMarkersLabel("sample-change-markers.json");
  }, []);

  const clearChangeMarkers = useCallback(() => {
    setChangeMarkers([]);
    setChangeMarkersLabel(null);
  }, []);

  const loadSessionStatsFromFile = useCallback(async (file: File) => {
    const report = await parseSessionStatsFile(file);
    setSessionStats(report);
    setSessionStatsLabel(file.name);
    setSessionStatsEntries([]);
    setProvePackLabel(null);
    setProvePackCoverage(null);
    setLastProvePackJsonText(null);
  }, []);

  const clearSessionStats = useCallback(() => {
    setSessionStats(null);
    setSessionStatsLabel(null);
    setSessionStatsEntries([]);
  }, []);

  const loadDiscoverLatestFromFile = useCallback(async (file: File) => {
    const summary = await parseDiscoverLatestFile(file);
    setDiscoverLatest(summary);
    setDiscoverLatestLabel(file.name);
    setDiscoverEntries([]);
    setProvePackLabel(null);
    setProvePackCoverage(null);
    setLastProvePackJsonText(null);
  }, []);

  const clearDiscoverLatest = useCallback(() => {
    setDiscoverLatest(null);
    setDiscoverLatestLabel(null);
    setDiscoverEntries([]);
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

  // Optional `?markers=/prove-change-latest.json` Prove handoff.
  useEffect(() => {
    const bootMarkers = resolveBootMarkersUrl();
    if (!bootMarkers) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(bootMarkers);
        if (!response.ok) {
          throw new Error(`Could not fetch ${bootMarkers} (${response.status})`);
        }
        const markers = parseChangeMarkersJson(await response.text());
        if (!cancelled) {
          setChangeMarkers(markers);
          setChangeMarkersLabel(bootMarkers);
        }
      } catch {
        /* leave markers empty; operator can load from Source */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optional `?session=/session-stats.json` Prove handoff.
  useEffect(() => {
    const bootSession = resolveBootSessionUrl();
    if (!bootSession) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(bootSession);
        if (!response.ok) {
          throw new Error(`Could not fetch ${bootSession} (${response.status})`);
        }
        const report = parseSessionStatsJson(await response.text());
        if (!cancelled) {
          setSessionStats(report);
          setSessionStatsLabel(bootSession);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optional `?discover=/discover-latest.json` Prove handoff.
  useEffect(() => {
    const bootDiscover = resolveBootDiscoverUrl();
    if (!bootDiscover) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(bootDiscover);
        if (!response.ok) {
          throw new Error(`Could not fetch ${bootDiscover} (${response.status})`);
        }
        const summary = parseDiscoverLatestJson(await response.text());
        if (!cancelled) {
          setDiscoverLatest(summary);
          setDiscoverLatestLabel(bootDiscover);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optional `?pack=/org-prove-pack.json` Prove handoff (#F25).
  useEffect(() => {
    const bootPack = resolveBootPackUrl();
    if (!bootPack) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(bootPack);
        if (!response.ok) {
          throw new Error(`Could not fetch ${bootPack} (${response.status})`);
        }
        const text = await response.text();
        if (!cancelled) {
          applyProvePackState(parseProvePackJson(text), bootPack);
          setLastProvePackJsonText(text);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyProvePackState]);

  // Auto period-bind when Fix markers + ≥2 usage snapshots exist.
  useEffect(() => {
    if (changeMarkers.length === 0) {
      return;
    }
    const periods = listUsagePeriods(usageSnapshots);
    if (periods.length < 2) {
      return;
    }
    // Only auto-bind when after period not yet chosen.
    if (afterPeriodRef.current) {
      return;
    }
    const bound = bindPeriodsAroundMarkers(usageSnapshots, changeMarkers);
    if (bound.baselinePeriod && bound.afterPeriod) {
      applyPeriodPair(bound.baselinePeriod, bound.afterPeriod);
    }
    setPeriodBindUnbound(bound.unbound);
  }, [changeMarkers, usageSnapshots, applyPeriodPair]);

  const restoreAttempted = useRef(false);
  useEffect(() => {
    if (restoreAttempted.current || !loaded.seed) {
      return;
    }
    if (!shouldAutoRestoreProveSession()) {
      return;
    }
    restoreAttempted.current = true;
    if (hasStoredProveSession()) {
      restoreLastProveSession();
    }
  }, [loaded.seed, restoreLastProveSession]);

  const skipPersistRef = useRef(true);
  useEffect(() => {
    if (!loaded.seed) {
      return;
    }
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const saved = saveProveSession({
      sourceLabel: loaded.sourceLabel,
      packJsonText: lastProvePackJsonText ?? undefined,
      seed: lastProvePackJsonText ? undefined : loaded.seed,
      markers: changeMarkers,
      changeMarkersLabel: changeMarkersLabel,
      sessionStatsEntries,
      discoverEntries,
      coverage: provePackCoverage,
      provePackLabel,
      sessionStatsLabel,
      discoverLatestLabel,
      usageLabel: loaded.usageLabel,
      usageSnapshots:
        Object.keys(usageSnapshots).length > 0 ? usageSnapshots : undefined,
      usageSnapshotLabels:
        Object.keys(usageSnapshotLabels).length > 0 ? usageSnapshotLabels : undefined,
      baselinePeriod,
      afterPeriod,
    });
    if (saved) {
      setStoredProveSessionAvailable(true);
    }
  }, [
    loaded.seed,
    loaded.sourceLabel,
    loaded.usageLabel,
    lastProvePackJsonText,
    changeMarkers,
    changeMarkersLabel,
    sessionStatsEntries,
    discoverEntries,
    provePackCoverage,
    provePackLabel,
    sessionStatsLabel,
    discoverLatestLabel,
    usageSnapshots,
    usageSnapshotLabels,
    baselinePeriod,
    afterPeriod,
  ]);

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
      applyAssumptionPresetId,
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
      periodBindUnbound,
      dismissPeriodBindUnbound,
      changeMarkers,
      changeMarkersLabel,
      fixOnTeams,
      loadChangeMarkersFromFile,
      loadDemoChangeMarkers,
      clearChangeMarkers,
      sessionStats,
      sessionStatsLabel,
      loadSessionStatsFromFile,
      clearSessionStats,
      discoverLatest,
      discoverLatestLabel,
      loadDiscoverLatestFromFile,
      clearDiscoverLatest,
      sessionStatsEntries,
      discoverEntries,
      provePackCoverage,
      provePackLabel,
      loadProvePackFromFile,
      clearProvePack,
      usageTeamMap,
      usageTeamMapLabel,
      loadUsageTeamMapFromFile,
      clearUsageTeamMap,
      hasStoredProveSession: storedProveSessionAvailable,
      restoreLastProveSession,
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
      applyAssumptionPresetId,
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
      periodBindUnbound,
      dismissPeriodBindUnbound,
      changeMarkers,
      changeMarkersLabel,
      fixOnTeams,
      loadChangeMarkersFromFile,
      loadDemoChangeMarkers,
      clearChangeMarkers,
      sessionStats,
      sessionStatsLabel,
      loadSessionStatsFromFile,
      clearSessionStats,
      discoverLatest,
      discoverLatestLabel,
      loadDiscoverLatestFromFile,
      clearDiscoverLatest,
      sessionStatsEntries,
      discoverEntries,
      provePackCoverage,
      provePackLabel,
      loadProvePackFromFile,
      clearProvePack,
      usageTeamMap,
      usageTeamMapLabel,
      loadUsageTeamMapFromFile,
      clearUsageTeamMap,
      storedProveSessionAvailable,
      restoreLastProveSession,
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
