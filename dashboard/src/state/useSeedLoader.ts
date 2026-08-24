import { useCallback, useEffect, useMemo, useState } from "react";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  DEMO_SEED_URL,
  DEMO_USAGE_URL,
  aggregateTotals,
  errorMessage,
  parseUsageFile,
  parseUsageJson,
  parseUsageText,
  resolveBootSourceUrl,
  resolveBootUsageUrl,
  type DashboardSeed,
  type UsageMetrics,
} from "../domain";
import {
  fetchDashboardDocument,
  loadDemoSeed,
  parseDashboardFile,
} from "../data/loadDocument";

const EMPTY_TOTALS: TokenRiskTotals = {
  beforeTokens: 0,
  afterTokens: 0,
  savedTokens: 0,
};

export function useSeedLoader() {
  const [seed, setSeed] = useState<DashboardSeed | null>(null);
  const [sourceLabel, setSourceLabel] = useState(DEMO_SEED_URL);
  const [usageLabel, setUsageLabel] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applySeed = useCallback(
    (
      next: DashboardSeed,
      label: string,
      usageLabelMode: "from-seed" | "keep" = "from-seed",
    ) => {
      setSeed(next);
      setSourceLabel(label);
      setLoadError(null);
      if (usageLabelMode === "keep") {
        return;
      }
      setUsageLabel(
        next.usage
          ? next.usage.source === "demo"
            ? DEMO_USAGE_URL
            : label
          : null,
      );
    },
    [],
  );

  const applyUsage = useCallback((usage: UsageMetrics | undefined, label: string | null) => {
    setSeed((current) => {
      if (!current) {
        return current;
      }
      if (!usage) {
        const rest = { ...current };
        delete rest.usage;
        return rest;
      }
      return { ...current, usage };
    });
    setUsageLabel(label);
    setLoadError(null);
  }, []);

  const fail = useCallback((error: unknown) => {
    setLoadError(errorMessage(error));
  }, []);

  const resetToDemo = useCallback(async () => {
    try {
      applySeed(await loadDemoSeed(), DEMO_SEED_URL);
    } catch (error) {
      fail(error);
    }
  }, [applySeed, fail]);

  const mergePreservingUsage = useCallback(
    (next: DashboardSeed): { seed: DashboardSeed; keepUsageLabel: boolean } => {
      if (next.usage || !seed?.usage) {
        return { seed: next, keepUsageLabel: false };
      }
      return { seed: { ...next, usage: seed.usage }, keepUsageLabel: true };
    },
    [seed],
  );

  const loadFromFile = useCallback(
    async (file: File) => {
      try {
        const merged = mergePreservingUsage(await parseDashboardFile(file));
        applySeed(merged.seed, file.name, merged.keepUsageLabel ? "keep" : "from-seed");
      } catch (error) {
        fail(error);
      }
    },
    [applySeed, fail, mergePreservingUsage],
  );

  const loadFromUrl = useCallback(
    async (url: string) => {
      try {
        const merged = mergePreservingUsage(await fetchDashboardDocument(url));
        applySeed(merged.seed, url, merged.keepUsageLabel ? "keep" : "from-seed");
      } catch (error) {
        fail(error);
      }
    },
    [applySeed, fail, mergePreservingUsage],
  );

  const loadUsageFromFile = useCallback(
    async (file: File) => {
      if (!seed) {
        fail(new Error("Load a scan report before importing billed usage."));
        return;
      }
      try {
        applyUsage(await parseUsageFile(file), file.name);
      } catch (error) {
        fail(error);
      }
    },
    [applyUsage, fail, seed],
  );

  const loadUsageFromUrl = useCallback(
    async (url: string) => {
      if (!seed) {
        fail(new Error("Load a scan report before importing billed usage."));
        return;
      }
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Could not fetch ${url} (${response.status})`);
        }
        applyUsage(parseUsageText(await response.text(), url), url);
      } catch (error) {
        fail(error);
      }
    },
    [applyUsage, fail, seed],
  );

  const resetUsageToDemo = useCallback(async () => {
    if (!seed) {
      fail(new Error("Load a scan report before restoring demo usage."));
      return;
    }
    try {
      const response = await fetch(DEMO_USAGE_URL);
      if (!response.ok) {
        throw new Error(`Could not fetch ${DEMO_USAGE_URL} (${response.status})`);
      }
      applyUsage(parseUsageJson(await response.text(), "demo"), DEMO_USAGE_URL);
    } catch (error) {
      fail(error);
    }
  }, [applyUsage, fail, seed]);

  const clearUsage = useCallback(() => {
    applyUsage(undefined, null);
  }, [applyUsage]);

  useEffect(() => {
    const bootSrc = resolveBootSourceUrl();
    if (!bootSrc) {
      void resetToDemo();
      return;
    }
    void (async () => {
      try {
        applySeed(await fetchDashboardDocument(bootSrc), bootSrc);
      } catch (error) {
        fail(error);
        await resetToDemo();
      }
    })();
  }, [applySeed, fail, resetToDemo]);

  // Optional `?usage=` for synced baseline handoff (#94).
  useEffect(() => {
    const bootUsage = resolveBootUsageUrl();
    if (!bootUsage || !seed) {
      return;
    }
    void loadUsageFromUrl(bootUsage);
  }, [loadUsageFromUrl, seed]);

  return useMemo(() => {
    const reports = seed?.reports ?? [];
    const totals = seed ? aggregateTotals(reports) : EMPTY_TOTALS;
    return {
      seed,
      reports,
      totals,
      sourceLabel,
      usageLabel,
      loadError,
      loadFromFile,
      loadFromUrl,
      loadUsageFromFile,
      loadUsageFromUrl,
      resetUsageToDemo,
      clearUsage,
      resetToDemo,
    };
  }, [
    seed,
    sourceLabel,
    usageLabel,
    loadError,
    loadFromFile,
    loadFromUrl,
    loadUsageFromFile,
    loadUsageFromUrl,
    resetUsageToDemo,
    clearUsage,
    resetToDemo,
  ]);
}
