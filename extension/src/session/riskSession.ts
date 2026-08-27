import { primaryReason } from "@tokenforge/risk-core";
import { TabFilterStore } from "../filter/filterStore";
import { isFiltered } from "../filter/types";
import type { TabDecision } from "../filter/types";
import { idleHintForTab } from "../tabs/idleHint";
import { TabRegistry } from "../tabs/registry";
import type { TrackedTab } from "../tabs/types";
import { buildRiskPulseModel, type RiskPulseModel } from "./riskPulse";
import { SessionLedger, type SessionLedgerEntry } from "./sessionLedger";

type ChangeListener = () => void;

/**
 * Composes tab scoring with Keep / Filter decisions for status bar + panel.
 *
 * Nuance: only `filtered` drops from displayed at-risk tokens. `kept` stays in
 * the readout (still at risk) but is marked for export as intentionally kept.
 */
export class RiskSession {
  private readonly listeners = new Set<ChangeListener>();
  private readonly disposables: Array<{ dispose(): void }> = [];

  readonly ledger = new SessionLedger();

  constructor(
    readonly registry: TabRegistry,
    readonly filters: TabFilterStore = new TabFilterStore(),
  ) {
    this.disposables.push(
      registry.onDidChange(() => this.notify()),
      filters.onDidChange(() => this.notify()),
      this.ledger.onDidChange(() => this.notify()),
    );
  }

  decision(uri: string): TabDecision {
    return this.filters.get(uri);
  }

  keep(uri: string): void {
    const wasFiltered = this.filters.get(uri) === "filtered";
    this.filters.set(uri, "kept");
    if (wasFiltered) {
      this.ledger.remove(uri);
    }
  }

  filter(uri: string): void {
    this.filters.set(uri, "filtered");
    this.recordFilterInLedger(uri);
  }

  clearDecision(uri: string): void {
    const wasFiltered = this.filters.get(uri) === "filtered";
    this.filters.clear(uri);
    if (wasFiltered) {
      this.ledger.remove(uri);
    }
  }

  clearAllDecisions(): void {
    this.filters.clearAll();
    this.ledger.clearAll();
  }

  /** Cumulative tokens avoided this window (Filter events, survives tab close). */
  sessionAvoidedTokens(): number {
    return this.ledger.totalAvoided();
  }

  /** Filtered paths this session — includes closed tabs until Restore or Clear. */
  sessionHistory(): readonly SessionLedgerEntry[] {
    return this.ledger.list();
  }

  refreshScores(nowMs: number = Date.now()): void {
    this.registry.refresh(nowMs);
  }

  listAll(nowMs: number = Date.now()): readonly TrackedTab[] {
    return this.registry.list(nowMs);
  }

  listAtRisk(nowMs: number = Date.now()): TrackedTab[] {
    return this.registry.listAtRisk(nowMs);
  }

  /** At-risk tabs that the user has not filtered out of the estimate. */
  listDisplayAtRisk(nowMs: number = Date.now()): TrackedTab[] {
    return this.listAtRisk(nowMs).filter(
      (tab) => !isFiltered(this.filters.get(tab.uri)),
    );
  }

  listPendingAtRisk(nowMs: number = Date.now()): TrackedTab[] {
    return this.listAtRisk(nowMs).filter(
      (tab) => this.filters.get(tab.uri) === "pending",
    );
  }

  listKeptAtRisk(nowMs: number = Date.now()): TrackedTab[] {
    return this.listAtRisk(nowMs).filter(
      (tab) => this.filters.get(tab.uri) === "kept",
    );
  }

  listFilteredAtRisk(nowMs: number = Date.now()): TrackedTab[] {
    return this.listAtRisk(nowMs).filter(
      (tab) => this.filters.get(tab.uri) === "filtered",
    );
  }

  /**
   * Open tabs that are not yet at-risk but are within the inactivity window
   * (idle ≥1m, still under 15m). Used for the Approaching panel section.
   */
  listApproachingIdle(nowMs: number = Date.now()): TrackedTab[] {
    const activeUri = this.registry.getActiveUri();
    return this.listAll(nowMs).filter((tab) => {
      if (tab.assessment.atRisk) {
        return false;
      }
      if (isFiltered(this.filters.get(tab.uri))) {
        return false;
      }
      const hint = idleHintForTab(tab, nowMs, {
        background: activeUri !== tab.uri,
      });
      return hint?.kind === "at_risk_in";
    });
  }

  displayAtRiskTokens(nowMs: number = Date.now()): number {
    return this.listDisplayAtRisk(nowMs).reduce(
      (sum, tab) => sum + tab.assessment.estTokens,
      0,
    );
  }

  /** Live totals + per-tab segments for the Risk pulse webview. */
  pulse(nowMs: number = Date.now()): RiskPulseModel {
    return buildRiskPulseModel(this.listAll(nowMs), (uri) => this.decision(uri));
  }

  onDidChange(listener: ChangeListener): { dispose(): void } {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.listeners.clear();
  }

  private recordFilterInLedger(uri: string, nowMs: number = Date.now()): void {
    const tab = this.registry.get(uri, nowMs);
    if (!tab) {
      return;
    }
    const reason = primaryReason(tab.assessment.reasons);
    if (reason === undefined) {
      return;
    }
    this.ledger.recordFilter(
      {
        uri: tab.uri,
        path: tab.path,
        estTokens: tab.assessment.estTokens,
        reason,
      },
      nowMs,
    );
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
