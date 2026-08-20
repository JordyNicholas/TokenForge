import type { TabDecision } from "./types";

type ChangeListener = () => void;

/**
 * User Keep / Filter decisions keyed by editor URI (same key as TabRegistry).
 * Default for unknown URIs is `pending`.
 */
export class TabFilterStore {
  private readonly decisions = new Map<string, TabDecision>();
  private readonly listeners = new Set<ChangeListener>();

  get(uri: string): TabDecision {
    return this.decisions.get(uri) ?? "pending";
  }

  set(uri: string, decision: TabDecision): void {
    const previous = this.get(uri);
    if (previous === decision) {
      return;
    }
    if (decision === "pending") {
      this.decisions.delete(uri);
    } else {
      this.decisions.set(uri, decision);
    }
    this.notify();
  }

  clear(uri: string): void {
    if (!this.decisions.has(uri)) {
      return;
    }
    this.decisions.delete(uri);
    this.notify();
  }

  /** Reset every Keep / Filter decision back to pending. */
  clearAll(): void {
    if (this.decisions.size === 0) {
      return;
    }
    this.decisions.clear();
    this.notify();
  }

  /** Snapshot for export / tests. */
  entries(): ReadonlyMap<string, TabDecision> {
    return new Map(this.decisions);
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
