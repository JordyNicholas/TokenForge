import { TabFilterStore } from "../filter/filterStore";
import { isFiltered } from "../filter/types";
import type { TabDecision } from "../filter/types";
import { TabRegistry } from "../tabs/registry";
import type { TrackedTab } from "../tabs/types";

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

  constructor(
    readonly registry: TabRegistry,
    readonly filters: TabFilterStore = new TabFilterStore(),
  ) {
    this.disposables.push(
      registry.onDidChange(() => this.notify()),
      filters.onDidChange(() => this.notify()),
    );
  }

  decision(uri: string): TabDecision {
    return this.filters.get(uri);
  }

  keep(uri: string): void {
    this.filters.set(uri, "kept");
  }

  filter(uri: string): void {
    this.filters.set(uri, "filtered");
  }

  clearDecision(uri: string): void {
    this.filters.clear(uri);
  }

  listAll(nowMs: number = Date.now()): readonly TrackedTab[] {
    return this.registry.list(nowMs);
  }

  /** At-risk tabs that the user has not filtered out of the estimate. */
  listDisplayAtRisk(nowMs: number = Date.now()): TrackedTab[] {
    return this.registry
      .listAtRisk(nowMs)
      .filter((tab) => !isFiltered(this.filters.get(tab.uri)));
  }

  displayAtRiskTokens(nowMs: number = Date.now()): number {
    return this.listDisplayAtRisk(nowMs).reduce(
      (sum, tab) => sum + tab.assessment.estTokens,
      0,
    );
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

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
