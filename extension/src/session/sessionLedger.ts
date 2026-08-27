import type { FindingReason } from "@tokenforge/risk-core";

type ChangeListener = () => void;

/** One Filter event this IDE window — survives tab close until Restore or Clear. */
export type SessionLedgerEntry = {
  uri: string;
  path: string;
  estTokens: number;
  reason: FindingReason;
  filteredAt: number;
};

export type SessionLedgerInput = {
  uri: string;
  path: string;
  estTokens: number;
  reason: FindingReason;
};

/**
 * Cumulative session savings from Filter events in the current window.
 * Independent of live at-risk (open tabs only).
 */
export class SessionLedger {
  private readonly entries = new Map<string, SessionLedgerEntry>();
  private readonly listeners = new Set<ChangeListener>();

  recordFilter(input: SessionLedgerInput, nowMs: number = Date.now()): void {
    this.entries.set(input.uri, { ...input, filteredAt: nowMs });
    this.notify();
  }

  remove(uri: string): void {
    if (!this.entries.delete(uri)) {
      return;
    }
    this.notify();
  }

  clearAll(): void {
    if (this.entries.size === 0) {
      return;
    }
    this.entries.clear();
    this.notify();
  }

  totalAvoided(): number {
    let sum = 0;
    for (const entry of this.entries.values()) {
      sum += entry.estTokens;
    }
    return sum;
  }

  list(): readonly SessionLedgerEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => b.filteredAt - a.filteredAt,
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

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
