import { useCallback, useEffect, useMemo, useState } from "react";
import type { TokenRiskTotals } from "@tokenforge/risk-core";
import {
  DEMO_SEED_URL,
  aggregateTotals,
  errorMessage,
  type DashboardSeed,
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const applySeed = useCallback((next: DashboardSeed, label: string) => {
    setSeed(next);
    setSourceLabel(label);
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

  return useMemo(() => {
    const reports = seed?.reports ?? [];
    const totals = seed ? aggregateTotals(reports) : EMPTY_TOTALS;
    return {
      seed,
      reports,
      totals,
      sourceLabel,
      loadError,
      loadFromFile,
      loadFromUrl,
      resetToDemo,
    };
  }, [
    seed,
    sourceLabel,
    loadError,
    loadFromFile,
    loadFromUrl,
    resetToDemo,
  ]);
}
